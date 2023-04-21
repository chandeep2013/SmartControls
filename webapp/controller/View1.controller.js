sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/m/MessageBox"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller,Filter,MessageBox) {
        var oOwnerComponent, oRouter,sServiceUrl,oDataModel;
        "use strict";

        return Controller.extend("com.tr.smartcontrol.controller.View1", {
            onInit: function () {
                oOwnerComponent = this.getOwnerComponent();
			    oRouter = oOwnerComponent.getRouter();
			    oRouter.attachRouteMatched(this.onRouteMatched, this);
            },
            onAfterRendering: function() {
            var date = new Date();
            var firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDate();
            var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
            if (firstDay < 10) {
                firstDay = "0" + firstDay;
            }
            this.getView().byId("idFromDate").setDateValue(new Date(date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + firstDay));
            this.getView().byId("idToDate").setDateValue(new Date(date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + lastDay));

                var oSmartTable = this.getView().byId("smartTable");
			    oSmartTable.setUseExportToExcel(true);
			    oSmartTable.setShowFullScreenButton(true);
			    var aColumns = oSmartTable.getTable().getColumns();
			    if (aColumns) {
			    	for (var i = 0; i < aColumns.length; i++) {
				    	//aColumns[i].setAutoResizable(true);
					    aColumns[i].setWidth("11rem");
				    }
			    }

            },
            onRouteMatched:function(){

            },
            getApplicationID: function() {
                return this.getOwnerComponent().getManifestEntry("/sap.app").id.replaceAll(".", "");
            },
            // Event to get application version
            getApplicationVersion: function() {
                return this.getOwnerComponent().getManifestEntry("/sap.app").applicationVersion.version;
            },
            // Event to get application router
            getApplicationRouter: function() {
                return "/" + this.getOwnerComponent().getManifestEntry("/sap.cloud").service;
            },
            getCompleteURL: function() {
                return this.getApplicationRouter() + "." + this.getApplicationID() + "-" + this.getApplicationVersion();
            },
            onBeforeRebindTable: function (oEvent) {
            
                var oSmartTable = this.getView().byId("smartTable");
                var fromDate = this.getView().byId("idFromDate").getValue();
                var ToDate = this.getView().byId("idToDate").getValue();
                if (fromDate === "" || ToDate === "") {
                    MessageBox.error("Enter Mandatory Fields..!");
                    return;
                }
                oSmartTable.setTableBindingPath("/C_TRIALBALANCE(P_FromPostingDate=datetime'" + fromDate + "T00:00:00',P_ToPostingDate=datetime'" + ToDate + "T00:00:00')/Results");
                var oBindingParams = oEvent.getParameter("bindingParams");
                this.addBindingListener(oBindingParams, "dataReceived",this._onBindingDataReceivedListener.bind(this));
            },
            _onBindingDataReceivedListener:function(oControlEvent){
                this.PostData = JSON.parse(oControlEvent.getParameters().data.__batchResponses[1].body).d.results;
                //console.log(itemCount);
            },
            onBeforeExport: function(oEvt) {
                var mExcelSettings = oEvt.getParameter("exportSettings");
    
                // Disable Worker as Mockserver is used in Demokit sample
                mExcelSettings.worker = false;   //
            },
            addBindingListener: function(oBindingInfo, sEventName, fHandler) {

                oBindingInfo.events = oBindingInfo.events || {};
                
                if (!oBindingInfo.events[sEventName]) {
                oBindingInfo.events[sEventName] = fHandler;
                } else {
                // Wrap the event handler of the other party to add our handler.
                    var fOriginalHandler = oBindingInfo.events[sEventName];
                    oBindingInfo.events[sEventName] = function() {
                    fHandler.apply(this, arguments);
                    fOriginalHandler.apply(this, arguments);
                };
             }
            },
            onPressSubmit: function() {
                sap.ui.core.BusyIndicator.show(-1);
                var data = this.PostData;
                for (var i = 0; i < data.length; i++) {
                    delete data[i].__metadata;
                }
                //this.getCompleteURL() + 
                var getToken = new Promise(function(resolve, reject) {
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET",  this.getCompleteURL() + "/http/push2otp1", true);
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.withCredentials = true;
                        xhr.setRequestHeader("x-csrf-token", "fetch");
                        xhr.onreadystatechange = function() { //Call a function when the state changes.
                            if (xhr.readyState === 4 && xhr.status === 200) {
                                var csrfToken = xhr.getResponseHeader("x-csrf-token");
                                resolve(csrfToken);
                            }
                            if(xhr.status !== 200){
                                reject();
                            }
                        };
                        xhr.send();
                }.bind(this));
    
                getToken.then(function(csrfToken){
                    var url = this.getCompleteURL() + "/http/push2otp1";
                    var postxhr = new XMLHttpRequest();
                    postxhr.open("POST", url, true);
                    postxhr.setRequestHeader("x-csrf-token", csrfToken);
                    postxhr.setRequestHeader("Content-Type", "application/json; charset=utf-8");
                    postxhr.setRequestHeader("Accept", "application/json");
                    postxhr.onreadystatechange = function() { //Call a function when the state changes.
                        if (postxhr.readyState === 4 && postxhr.status === 201 && postxhr.statusText === "Created") {
                            var res = JSON.parse(postxhr.responseText);
                            MessageBox.success("File " + res.id + " Posted Successfully!");
                            sap.ui.core.BusyIndicator.hide();
                        }
                        else if(postxhr.readyState === XMLHttpRequest.DONE && postxhr.status !== 201){
                            sap.m.MessageToast.show(postxhr.statusText);
                            sap.ui.core.BusyIndicator.hide();
                        }
                    };
                    postxhr.send(JSON.stringify(data));
                    var response = postxhr.responseText;
                }.bind(this))['catch'](function() {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error("Error on Posting the data..!");
                }.bind(this));
    
            }
        });
    });
