class AddStationsPanel extends ZCustomController {
    onThis_init() {
        window.geoos.addStationsPanel = this;
        this.open = false;
        this.infoOpen = false;
        this.infoStationCode = null;
        this.stationsInfoContent.hide();
        this.stationsInfoPanel.hide();
        this.hide();
        window.geoos.events.on("top", "clickStations", _ => this.toggle())
        let dataProveedores = Object.keys(window.geoos.estaciones.proveedores).reduce((lista, p) => {
            lista.push(window.geoos.estaciones.proveedores[p]);
            return lista;
        }, []).sort((p1, p2) => (p1.name > p2.name?1:-1));
        let dataTipos = Object.keys(window.geoos.estaciones.tipos).reduce((lista, t) => {
            lista.push(window.geoos.estaciones.tipos[t]);
            return lista;
        }, []).sort((t1, t2) => (t1.name > t2.name?1:-1));
        let dataVariables = Object.keys(window.geoos.estaciones.variables).reduce((lista, v) => {
            lista.push(window.geoos.estaciones.variables[v]);
            return lista;
        }, []).sort((v1, v2) => (v1.name > v2.name?1:-1));
        this.sections = [{
            code:"providers", name:"Filtrar por Proveedor o Agencia", data:dataProveedores
        }, {
            code:"types", name:"Filtrar por Tipo de Estación", data:dataTipos
        }, {
            code:"variables", name:"Filtrar por Sensor / Variable Monitoreada", data:dataVariables
        }]
        this.filters = {};
        this.sections.forEach(section => this.filters[section.code] = [])
        this.stations = window.geoos.getAvailableStations();
        this.refresh();
    }

    doResize(size) {
        if (!this.open) return;
        this.applySize();
    }
    applySize() {
        let size = window.geoos.size;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let height = size.height - (topMenuRect.top + topMenuRect.height);
        let width = size.width - 28;
        this.addStationsPanelContainer.view.style.left = "30px";
        this.addStationsPanelContainer.view.style.top = (size.height - height - 5) + "px";
        this.addStationsPanelContainer.view.style.width = width + "px";
        this.addStationsPanelContainer.view.style.height = height + "px";
        this.stationsContentRow.view.style.height = (height - 50) + "px";
    }

    toggle() {
        this.addStationsPanelContent.hide();
        this.applySize();
        if (this.open) {
            this.addStationsPanelContainer.view.style["margin-left"] = "0";
            $(this.addStationsPanelContainer.view).animate({"margin-left": (window.geoos.size.width - 30)}, 300, _ => {
                this.hide();
                this.open = false;
                window.geoos.topPanel.deactivateOption("opStations");
            });
        } else {
            window.geoos.closeFloatingPanels();
            this.show();
            this.addStationsPanelContainer.view.style["margin-left"] = (window.geoos.size.width - 30) + "px";
            $(this.addStationsPanelContainer.view).animate({"margin-left": 0}, 300, _ => {
                this.addStationsPanelContent.show();
                this.refresh();
                this.open = true;
                this.edStationsNameFilter.focus();
                window.geoos.topPanel.activateOption("opStations");
            });
        }
    }

    onCmdCloseAddStationsPanel_click() {this.toggle()}

    filterStations(excludeSection, textFilter) {
        let filtered = [];
        for (let station of this.stations) {
            let passFilter = true;
            for (let section of this.sections) {
                if (passFilter && (!excludeSection || excludeSection != section.code)) {
                    let filters = this.filters[section.code];
                    if (filters.length) {
                        let hasSomeFilter = false;
                        filters.forEach(f => {
                            if (f == "no") {
                                if (!station[section.code].length) hasSomeFilter = true;
                            } else if (station[section.code].indexOf(f) >= 0) {
                                hasSomeFilter = true;
                            }
                        })
                        if (!hasSomeFilter) passFilter = false;
                    }
                }
            }
            if (passFilter) filtered.push(station);
        }
        if (textFilter) filtered = filtered.filter(l => (l.name.toLowerCase().indexOf(textFilter.toLowerCase()) >= 0))
        return filtered;
    }
    refresh() {
        let htmlSections = "";
        for (let section of this.sections) {
            let firstSection = !htmlSections;
            let stations = this.filterStations(section.code);
            section.data.forEach(r => r.nStations = 0);
            stations.forEach(station => {
                let sectionCodes = station[section.code];
                if (!sectionCodes.length) {
                    section.data.find(r => r.code == "no").nStations++;
                } else {
                    sectionCodes.forEach(code => {
                        let r = section.data.find(r => r.code == code);
                        if (!r) console.error("No data with code '" + code + "' found in secton '" + section.code + "' declared in station ", station);
                        else r.nStations++;
                    })
                }
            })
            let filteredRows = section.data.filter(r => r.nStations > 0);
            section.filteredData = filteredRows;
            htmlSections += `
                <div class="section-filter ${firstSection?"":"border-top"}" data-section="${section.code}">
                    <div class="section-filter-caption">
                        <i class="fas fa-chevron-right float-left mr-2 ${section.open?" expanded":""}"></i>
                        ${section.name}
                    </div>
                    <div class="section-filter-items">
            `;
            filteredRows.forEach(row => {
                let selected = this.filters[section.code].indexOf(row.code) >= 0;
                htmlSections += `
                    <div class="section-filter-item" data-section="${section.code}" data-code="${row.code}">
                        <i class="far fa-lg ${selected?"fa-check-square":"fa-square"} float-left mr-2"></i>
                        ${row.name + " (" + row.nStations + ")"}
                    </div>
                `;
            });
            htmlSections += `
                    </div>
                </div>
            `;
        }
        this.stationsAccordion.html = htmlSections;
        let accordion = $(this.stationsAccordion.view);
        accordion.find(".section-filter").each((idx, div) => {
            let code = $(div).data("section");
            let section = this.sections.find(s => s.code == code)
            if (!section.open) $(div).find(".section-filter-items").hide();
        });
        accordion.find(".section-filter-caption").click(e => {
            let caption = $(e.currentTarget);
            let code = caption.parent().data("section");
            let section = this.sections.find(s => s.code == code)
            let items = caption.parent().find(".section-filter-items");
            if (section.open) {
                caption.find("i").removeClass("expanded");
                items.animate({height:0}, 300, _ => {
                    items.hide();
                    section.open = false;
                    //caption.find("i").removeClass("fa-chevron-up").addClass("fa-chevron-down")
                })
            } else {
                items.css({height:0});
                items.show();
                caption.find("i").addClass("expanded");
                items.animate({height:section.filteredData.length * 22}, 300, _ => {
                    section.open = true;
                    //caption.find("i").removeClass("fa-chevron-down").addClass("fa-chevron-up")
                })
            }
        })
        accordion.find(".section-filter-item").click(e => {
            let item = $(e.currentTarget);
            console.log("item", item);
            let sectionCode = item.data("section");
            let rowCode = item.data("code");            
            let idx = this.filters[sectionCode].indexOf(rowCode);
            if (idx < 0) {
                this.filters[sectionCode].push(rowCode);                
            } else {
                this.filters[sectionCode].splice(idx, 1);
            }
            this.refresh();
        })

        // Filters
        let htmlFilters = "";
        for (let section of this.sections) {
            let filters = this.filters[section.code];
            for (let code of filters) {
                htmlFilters += `
                    <div class="add-panel-filter">
                        ${section.data.find(r => r.code == code).name}
                        <i class="closer fas fa-times ml-2" data-section="${section.code}" data-code="${code}"></i>
                    </div>
                `;
            }
        }
        if (htmlFilters.length) {
            this.stationsFilterPills.html = "<b style='margin-left: 6px;'>Filtros Activos: </b>" + htmlFilters + "<a href='#' class='filters-cleaner'>Limpiar Filtros</a>";
            this.stationsFilterPills.show();
            $(this.stationsFilterPills.view).find(".add-panel-filter i").click(e => {
                let item = $(e.currentTarget);
                let sectionCode = item.data("section");
                let rowCode = item.data("code");
                let idx = this.filters[sectionCode].indexOf(rowCode);
                this.filters[sectionCode].splice(idx, 1);
                this.refresh();
            })
            $(this.stationsFilterPills.view).find(".filters-cleaner").click(_ => this.refresh());
        } else {
            this.stationsFilterPills.html = "";
            this.stationsFilterPills.hide();
        }

        // Results
        this.filteredStations = this.filterStations(null, this.edStationsNameFilter.value);
        this.lblStationsResume.text = this.filteredStations.length + " estaciones encontradas";
        let htmlStations = "";
        for (let station of this.filteredStations) {
            htmlStations += `
                <div class="add-panel-variable" data-code="${station.code}">
                    <i class="far fa-lg ${window.geoos.isStationAdded(station.code)?"fa-check-square":"fa-square"} float-left mr-2"></i>
                    ${station.name}
                    <img class="add-panel-variable-icon info" style="height: 16px;" src="img/icons/info${this.infoStationCode==station.code?"-active":""}.svg" />
                    <img class="add-panel-variable-icon favo" style="height: 16px;" src="img/icons/favo.svg" />
                </div>
            `;
        }
        this.stationsContainer.html = htmlStations;
        if (this.infoOpen && this.filteredStations.findIndex(l => (l.code == this.infoStationCode)) < 0) this.closeInfo();
        $(this.stationsContainer.view).find(".info").click(e => {
            $(this.stationsContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
            let img = $(e.currentTarget);
            let div = img.parent();
            let code = div.data("code");
            let station = this.filteredStations.find(v => v.code == code);
            if (this.infoOpen) {
                if (this.infoStationCode == station.code) {
                    this.closeInfo();
                } else {
                    this.refreshInfo(station);
                    img.attr("src", "img/icons/info-active.svg");
                }
            } else {
                img.attr("src", "img/icons/info-active.svg");
                this.openInfo()
                    .then(_ => this.refreshInfo(station));
            }
            return false;           
        });
        $(this.stationsContainer.view).find(".added").click(e => (false))
        $(this.stationsContainer.view).find(".favo").click(e => {
            let img = $(e.currentTarget);
            let code = img.parent().data("code");
            let station = this.filteredStations.find(v => v.code == code);
            console.log("favo-station", station);
            return false;
        });
        $(this.stationsContainer.view).find(".add-panel-variable").click(e => {
            let div = $(e.currentTarget);
            let code = div.data("code");
            window.geoos.toggleStation(code);
            this.refresh();
        })
        this.refreshResume();        
    }

    refreshResume() {
        let nSelected = this.filteredStations.reduce((sum, l) => (l.selected?(sum+1):sum), 0);
        if (!nSelected) {
            this.lblStationsCountResume.text = "No hay estaciones seleccionadas";
        } else if (nSelected == 1) {
            this.lblStationsCountResume.text = "Una estación seleccionada";
        } else {
            this.lblStationsCountResume.text = nSelected + " estaciones seleccionadas";
        }
    }

    onEdStationsNameFilter_change() {
        this.refresh();
    }

    openInfo() {
        return new Promise(resolve => {
            this.infoContent.hide();
            this.infoPanel.view.style.height = "0";
            this.infoPanel.show();
            $(this.infoPanel.view).animate({height:200}, 300, _ => {
                this.infoOpen = true;
                this.addPanelTabContent.view.style.height = "150px";
                this.infoContent.show();
                resolve();
            });
        })
    }
    closeInfo() {
        return new Promise(resolve => {
            this.infoContent.hide();
            this.infoPanel.view.style.height = "200px";
            $(this.infoPanel.view).animate({height:0}, 300, _ => {
                this.infoOpen = false;
                this.infoVarCode = null;
                this.infoPanel.hide();
                resolve()
            })
        })
    }

    onCmdStationsCloseInfoPanel_click() {
        $(this.stationsContainer.view).find(".info").each((idx, i) => $(i).attr("src", "img/icons/info.svg"));
        this.closeInfo()
    }

    refreshInfo(layer) {
        console.log("variable", layer);
        this.infoVarCode = layer.code;
        this.lblVarName.text = layer.name;
        let provider = window.geoos.providers.find(p => p.code == layer.providers[0]);
        this.logoProvider.view.src = provider.logo;
        this.providerUrl.view.setAttribute("href", provider.url);
        this.providerUrl.text = provider.name;
        if (layer.type == "raster") {
            this.layerDescription.html = layer.variable.options.description || "<p>No hay descripción de la Capa</p>";
            this.layerDetails.html = layer.variable.options.details || "<p>No hay detalles de la Capa</p>";
            this.layerAvailability.html = layer.variable.options.availability || "<p>No hay detalles de la disponibilidad en GEOOS para la Capa</p>";
        }
    }
}
ZVC.export(AddStationsPanel);