class GEOOS {
    constructor() {
        this.events = new GEOOSEvents();
        this.groups = [];
        this.selection = {type:null}
        moment.locale("es")
        this._time = Date.now();
        this.calculatePortalSize();
        window.addEventListener("resize", _ => this.triggerResize());
    }

    async init() {
        this.config = await zPost("getPortalConfig.geoos");
        await this.buildMetadata();
        this.scalesFactory = new ScalesFactory();
        await this.scalesFactory.init();
    }

    get baseMaps() {return this.config.maps}
    get regions() {return this.config.groups.regions}
    get subjects() {return this.config.groups.subjects}
    get types() {return this.config.groups.types}
    get providers() {return this._providers}

    get map() {return this.mapPanel.map}
    get time() {return this._time}
    set time(t) {
        this._time = t;
        this.events.trigger("portal", "timeChange");
    }
    get bounds() {
        let b = this.map.getBounds();
        return {n:b.getNorth(), s:b.getSouth(), e:b.getEast(), w:b.getWest()}
    }
    get center() {
        let center = this.map.getCenter();
        return {lat:center.lat, lng:center.lng}
    }
    
    getGeoServer(code) {return this.geoServers.find(s => s.code == code)}

    triggerResize() {
        if (this.timerResize) clearTimeout(this.timerResize);
        setTimeout(_ => {
            this.timerResize = null;
            this.events.trigger("portal", "resize", this.calculatePortalSize())
        }, 300)
    }
    calculatePortalSize() {
        let width = document.documentElement.clientWidth;
        let height = document.documentElement.clientHeight;
        let size, sizeLevel;
        if (width <768) {size = "xs"; sizeLevel = 0;}
        else if (width < 992) {size = "s"; sizeLevel = 1;}
        else if (width < 1280) {size = "m"; sizeLevel = 2;}
        else if (width < 1366) {size = "l"; sizeLevel = 3;}
        else if (width < 1920) {size = "xl"; sizeLevel = 4;}
        else {size = "xxl"; sizeLevel = 5;}
        this.size = {width, height, size, sizeLevel};
        return this.size;
    }

    closeFloatingPanels() {
        if (this.myPanel.open) this.myPanel.toggle();
        if (this.addPanel.open) this.addPanel.toggle();
    }
    openMyPanel() {
        if (!this.myPanel.open) this.myPanel.toggle();
    }
    closeMyPanel() {
        if (this.myPanel.open) this.myPanel.toggle();
    }

    buildMetadata() {
        return new Promise((resolve, reject) => {
            let nPending = 0;        
            this.geoServers = [];
            for (let i=0; i<this.config.geoServers.length; i++) {            
                let url = this.config.geoServers[i];
                nPending++;
                this.getGeoServerMetadata(url)
                    .then(metadata => {
                        metadata.url = url;
                        this.geoServers.push(metadata);
                        if (--nPending <= 0) {
                            this.finishBuildMetadata();
                            resolve();
                        }
                    })            
                    .catch(err => {
                        console.error(err);
                        if (--nPending <= 0) {
                            this.finishBuildMetadata();
                            resolve();
                        }
                    })
            }
        })        
    }
    async getGeoServerMetadata(url) {
        try {
            let geoServerClient = new GEOServerClient(url);
            let metadata = await geoServerClient.readMetadata();
            metadata.client = geoServerClient;
            return metadata;
        } catch(error) {
            throw error;
        }

    }
    finishBuildMetadata() {
        this._providers = [];
        for (let geoServer of this.geoServers) {
            let list = geoServer.providers.reduce((list, provider) => {
                if (list.findIndex(p => p.code == provider.code) < 0) {
                    provider.logo = geoServer.url + "/" + provider.logo;
                    list.push(provider);
                }
                return list;
            }, [])
            this._providers = this._providers.concat(list);
        }
        this._providers.sort((p1, p2) => (p1.name > p2.name?1:-1));
        
        this.regions.sort((r1, r2) => (r1.name > r2.name?1:-1));
        this.regions.splice(0,0,{code:"no", name:"Sin Región Especificada"})        
        this.regions.forEach(r => r.nVars = 0);

        this.subjects.sort((r1, r2) => (r1.name > r2.name?1:-1));
        this.subjects.splice(0,0,{code:"no", name:"Sin Tema Especificado"})        
        this.subjects.forEach(r => r.nVars = 0);

        this.types.sort((r1, r2) => (r1.name > r2.name?1:-1));
        this.types.splice(0,0,{code:"no", name:"Sin Tipo Especificado"})        
        this.types.forEach(r => r.nVars = 0);
    }    

    getAvailableLayers(type) {
        let layers = [];
        if (type == "variables") {
            for (let geoServer of this.geoServers) {
                for (let dataSet of geoServer.dataSets) {
                    if (dataSet.type == "raster") {
                        for (let variable of dataSet.variables) {
                            layers.push({
                                type:"raster",
                                geoServer:geoServer, dataSet:dataSet,
                                providers:[dataSet.provider],
                                subjects:variable.options.subjects || [],
                                regions:variable.options.regions || [],
                                types:variable.options.types || [],
                                variable:variable,
                                code:dataSet.code + "." + variable.code, 
                                name:variable.name
                            })
                        }
                    }
                }
            }
        } else if (type == "vector") {
            for (let geoServer of this.geoServers) {
                for (let dataSet of geoServer.dataSets) {
                    if (dataSet.type == "vector") {
                        for (let file of dataSet.files) {
                            layers.push({
                                type:"vector",
                                name:file.commonName,
                                geoServer:geoServer,
                                dataSet:dataSet,
                                providers:[dataSet.provider],
                                subjects:file.options.subjects || [],
                                regions:file.options.regions || [],
                                types:file.options.types || [],
                                file:file,
                                code:dataSet.code + "." + file.name 
                            })
                        }
                    }
                }
            }
        } else {
            throw "Layer type '" + type + "' not yet supported";
        }
        layers.sort((l1, l2) => (l1.name > l2.name?1:-1))
        return layers;
    }

    getGroup(id) {return this.groups.find(g => g.id == id)}
    getActiveGroup() {return this.groups.find(g => (g.active))}
    addGroup(config) {
        let g = new GEOOSGroup(config);
        this.groups.push(g);
        return g;
    }
    addExistingGroup(g) {
        this.groups.push(g);
        return g;
    }
    async deleteGroup(id) {
        try {
            if (this.groups.length == 1) throw "No puede eliminar el último grupo";
            if (this.selection.type == "group" && this.selection.element.id == id) {
                await this.unselect();
            }
            let group = this.getGroup(id);
            if (group.active) {
                let newActive = this.groups.find(g => !g.active);
                this.activateGroup(newActive.id);
            }
            let idx = this.groups.findIndex(g => g.id == id);
            this.groups.splice(idx,1);
            await this.events.trigger("portal", "groupDeleted", group)
        } catch(error) {
            throw error;
        }
    }
    async activateGroup(groupId) {
        let g = this.getGroup(groupId);
        if (!g) throw "Can't find group '" + groupId + "'";
        let current = this.getActiveGroup();
        if (current) {
            await current.deactivate();
            await this.events.trigger("portal", "groupDeactivated", current)
        }
        await g.activate();
        await this.events.trigger("portal", "groupActivated", g)
    }
    async addLayers(layers, inGroup) {
        let group = inGroup || this.getActiveGroup();
        for (let layerDef of layers) {
            let geoosLayer = GEOOSLayer.create(layerDef);
            group.addLayer(geoosLayer);
        }
        await this.events.trigger("portal", "layersAdded", group)
    }

    async unselect() {
        if (!this.selection.type) return;
        let oldSelection = this.selection;
        this.selection = {type:null}
        await this.events.trigger("portal", "selectionChange", {oldSelection:oldSelection, newSelection:this.selection})
        
    }
    async selectElement(type, element) {
        if (!type) {
            this.unselect();
            return;
        }        
        let oldSelection = this.selection;                
        this.selection = {type:type, element:element};
        await this.events.trigger("portal", "selectionChange", {oldSelection:oldSelection, newSelection:this.selection})
    }

    async selectObject(layer, objectId) {
        if (this.selectedObject) {
            await this.unselectObject()
        }
        this.selectedObject = {layer, objectId};
        await this.events.trigger("map", "objectSelected", this.selectedObject);
    }
    async unselectObject() {
        let selected = this.selectedObject;
        this.selectedObject = null;
        await this.events.trigger("map", "obectUnselected", selected);
    }
}

window.geoos = new GEOOS();