/**
 * @fileoverview HW object class for connect arduino.
 */
'use strict';

goog.require("Entry.HWMontior");

Entry.HW = function() {
    this.connectTrial = 0;
    this.isFirstConnect = true;

    this.initSocket();
    this.connected = false;
    this.portData = {};
    this.sendQueue = {};
    this.outputQueue = {};
    this.settingQueue = {};
    this.selectedDevice = null;
    this.hwModule = null;
    this.socketType = null;

    Entry.addEventListener('stop', this.setZero);

    this.hwInfo = {
        '1.1': Entry.Arduino,
        '1.9': Entry.ArduinoExt,
        '1.2': Entry.SensorBoard,
        '1.3': Entry.CODEino,
        '1.4': Entry.joystick,
        '1.5': Entry.dplay,
        '1.6': Entry.nemoino,
        '1.7': Entry.Xbot,
        '1.8': Entry.ardublock,
        '1.A': Entry.Cobl,
        '2.4': Entry.Hamster,
        '2.5': Entry.Albert,
        '3.1': Entry.Bitbrick,
        '4.2': Entry.Arduino,
        '5.1': Entry.Neobot,
        '7.1': Entry.Robotis_carCont,
        '7.2': Entry.Robotis_openCM70,
        '8.1': Entry.Arduino,
        '10.1': Entry.Roborobo_Roduino,
        '10.2': Entry.Roborobo_SchoolKit,
        '12.1': Entry.EV3,
        'B.1': Entry.Codestar,
        '15.1': Entry.Byrobot_DroneFighter
    };
};

Entry.HW.TRIAL_LIMIT = 1;

var p = Entry.HW.prototype;

p.initSocket = function() {
    try{
        if (this.connectTrial >= Entry.HW.TRIAL_LIMIT) {
            if (!this.isFirstConnect)
                Entry.toast.alert(Lang.Menus.connect_hw,
                                  Lang.Menus.connect_fail,
                                  false);
            this.isFirstConnect = false;
            return;
        }
        var hw = this;

        var socket, socketSecurity;
        var protocol = '';
        this.connected = false;
        this.connectTrial++;

        if(location.protocol.indexOf('https') > -1) {
            socketSecurity = new WebSocket("wss://hardware.play-entry.org:23518");
        } else {
            try{
                socket = new WebSocket("ws://127.0.0.1:23518");
                socket.binaryType = "arraybuffer";

                socket.onopen = (function()
                {
                    hw.socketType = 'WebSocket';
                    hw.initHardware(socket);
                }).bind(this);

                socket.onmessage = (function (evt)
                {
                    var data = JSON.parse(evt.data);
                    hw.checkDevice(data);
                    hw.updatePortData(data);
                }).bind(this);

                socket.onclose = function()
                {
                    if(hw.socketType === 'WebSocket') {
                        this.socket = null;
                        hw.initSocket();
                    }
                };
            } catch(e) {}
            try{
                socketSecurity = new WebSocket("wss://hardware.play-entry.org:23518");
            } catch(e) {
            }
        }
        socketSecurity.binaryType = "arraybuffer";
        socketSecurity.onopen = function()
        {
            hw.socketType = 'WebSocketSecurity';
            hw.initHardware(socketSecurity);
        };

        socketSecurity.onmessage = function (evt)
        {
            var data = JSON.parse(evt.data);
            hw.checkDevice(data);
            hw.updatePortData(data);
        };

        socketSecurity.onclose = function()
        {
            if(hw.socketType === 'WebSocketSecurity') {
                this.socket = null;
                hw.initSocket();
            }
        };

        Entry.dispatchEvent("hwChanged");
    } catch(e) {}
};

p.retryConnect = function() {
    this.connectTrial = 0;
    this.initSocket();
};

p.initHardware = function(socket) {
    this.socket = socket;
    this.connectTrial = 0;

    this.connected = true;
    Entry.dispatchEvent("hwChanged");
    if (Entry.playground && Entry.playground.object)
        Entry.playground.setMenu(Entry.playground.object.objectType);
};

p.setDigitalPortValue = function(port, value) {
    this.sendQueue[port] = value;
    this.removePortReadable(port);
};

p.getAnalogPortValue = function(port) {
    if (!this.connected)
        return 0;
    return this.portData['a'+port];
};

p.getDigitalPortValue = function(port) {
    if (!this.connected)
        return 0;
    this.setPortReadable(port);
    if (this.portData[port] !== undefined) {
        return this.portData[port];
    }
    else
        return 0;
};

p.setPortReadable = function(port) {
    if (!this.sendQueue.readablePorts)
        this.sendQueue.readablePorts = [];

    var isPass = false;
    for(var i in this.sendQueue.readablePorts) {
        if(this.sendQueue.readablePorts[i] == port) {
            isPass = true;
            break;
        }
    }

    if(!isPass) {
        this.sendQueue.readablePorts.push(port);
    }
};
p.removePortReadable = function(port) {
    if (!this.sendQueue.readablePorts && !Array.isArray(this.sendQueue.readablePorts))
        return;
    var target;
    for(var i in this.sendQueue.readablePorts) {
        if(this.sendQueue.readablePorts[i] == port) {
            target = Number(i);
            break;
        }
    }

    if(target != undefined) {
        this.sendQueue.readablePorts = this.sendQueue.readablePorts.slice(0, target).concat(this.sendQueue.readablePorts.slice(target + 1, this.sendQueue.readablePorts.length));
    } else {
        this.sendQueue.readablePorts = [];
    }
}

p.update = function() {
    if (!this.socket) {
        return;
    }

    if(this.socket.readyState != 1) {
        return;
    }

    this.socket.send(JSON.stringify(this.sendQueue));
};

p.updatePortData = function(data) {
    this.portData = data;
    if (this.hwMonitor
        && Entry.propertyPanel.selected == 'hw') {
        this.hwMonitor.update();
    }
};

p.closeConnection = function() {
    if (this.socket) {
        this.socket.close();
    }
};

p.downloadConnector = function() {
    var url = "http://download.play-entry.org/apps/Entry_HW_1.5.11_Setup.exe";
    var win = window.open(url, '_blank');
    win.focus();
};

p.downloadGuide = function() {
    var url = "http://download.play-entry.org/data/%EC%97%94%ED%8A%B8%EB%A6%AC-%ED%95%98%EB%93%9C%EC%9B%A8%EC%96%B4%EC%97%B0%EA%B2%B0%EB%A7%A4%EB%89%B4%EC%96%BC_16_08_17.hwp";
    var win = window.open(url, '_blank');
    win.focus();
};

p.downloadSource = function() {
    var url = "http://play-entry.com/down/board.ino";
    var win = window.open(url, '_blank');
    win.focus();
};

p.setZero = function() {
    if (!Entry.hw.hwModule)
        return;
    Entry.hw.hwModule.setZero();
};

p.checkDevice = function(data) {
    if (data.company === undefined)
        return;
    var key = [Entry.Utils.convertIntToHex(data.company), '.', Entry.Utils.convertIntToHex(data.model)].join('');
    if (key == this.selectedDevice)
        return;
    this.selectedDevice = key;
    this.hwModule = this.hwInfo[key];
    Entry.dispatchEvent("hwChanged");
    Entry.toast.success(
        "하드웨어 연결 성공",
        /* Lang.Menus.connect_message.replace(
            "%1",
            Lang.Device[Entry.hw.hwModule.name]
        ) +*/ "하드웨어 아이콘을 더블클릭하면, 센서값만 확인할 수 있습니다.",
        true
    );
    if (this.hwModule.monitorTemplate) {

        if(!this.hwMonitor) {
            this.hwMonitor =new Entry.HWMonitor(this.hwModule);
        } else {
            this.hwMonitor._hwModule = this.hwModule;
            this.hwMonitor.initView();
        }
        Entry.propertyPanel.addMode("hw", this.hwMonitor);
        var mt = this.hwModule.monitorTemplate;

        if(mt.mode == "both") {
            mt.mode = "list";
            this.hwMonitor.generateListView();
            mt.mode = "general";
            this.hwMonitor.generateView();
            mt.mode = "both";
        } else if(mt.mode == "list") {
            this.hwMonitor.generateListView();
        } else {
            this.hwMonitor.generateView();
        }

    }
};

p.banHW = function() {
    var hwOptions = this.hwInfo;
    for (var i in hwOptions)
        Entry.playground.mainWorkspace.blockMenu.banClass(hwOptions[i].name, true);

};
