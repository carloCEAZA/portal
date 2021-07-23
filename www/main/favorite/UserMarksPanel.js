class UserMarksPanel extends ZCustomController {
    async onThis_init() {
        window.geoos.userMarksPanel = this;
        this.open = false;
        this.hide();
        window.geoos.events.on("top", "activateAction", action => {
            if (action == "favo" && !this.open) this.toggle();
        })
        window.geoos.events.on("top", "deactivateAction", action => {
            if (action == "favo" && this.open) this.toggle();
        })
        //window.geoos.events.on("portal", "favLayersAdded", _ => this.refresh());

    }

    async doResize() {        
        if (!this.open) return;
        let topMenuRect = window.geoos.topPanel.topPanelContainer.view.getBoundingClientRect();
        let top = (topMenuRect.top + topMenuRect.height - 6);
        this.favPanel.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.favStations.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
        this.favLayers.view.style["max-height"] = (window.geoos.size.height - top - 120) + "px";
    }

    onCmdCloseFavoPanel_click() {window.geoos.topPanel.deactivateAction("favo")}
    close() {
        if (this.open) window.geoos.topPanel.deactivateAction("favo")
    }

    toggle() {
        if (!this.open) {
            window.geoos.closeFloatingPanels();
            this.open = true;
            this.doResize();
            this.show();
        } else {
            this.open = false;
            this.hide();
        }
        this.refresh();
    }

    async refresh(){
        /* console.log("llego"); */
        console.log("favo", window.geoos.favLayers);
        this.favLayers.refresh();
    }
}
ZVC.export(UserMarksPanel);