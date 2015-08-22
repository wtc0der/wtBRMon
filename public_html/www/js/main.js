$(document).ready(function () {
    // Limite couleurs progress bar
        var val_warning = 75;
        var val_danger  = 85;
        var refresh = 3000;
    
    
    var datas_qos = {};
    var datas_hosts = {};
    var datas_hostnames = {};
    var datas_bw = {};

    var max_DL = 0;
    var max_UP = 0;
    
    // Listes des hotes actifs du réseau
        var myhosts = [];

    // Tableau des données de traffic
        var bw = {};
        var curr_bw = [];

        var total_DL_BW     = 0;
        var total_UP_BW     = 0;
        var total_PC_DL_BW  = 0;
        var total_PC_UP_BW  = 0;
        var total_DL        = 0;
        var total_UP        = 0;
    
    function bw_stringToInt (str) {
        var x = -1;
        str = str.toString();
       
        if (!str) return 0;
        
        if (str == "--") {
            x = 0;
        } else {
            var tab = str.split(" ");
            if (tab[1] == "o/s") x = tab[0];
            if (tab[1] == "Ko/s") x = tab[0]*1024;
            if (tab[1] == "Mo/s") x = tab[0]*1048576;
            if (tab[1] == "Go/s") x = tab[0]*1073741824;
        }
        
        return parseInt(x);
    }
    
    
    jQuery.fn.dataTableExt.oSort['bandwidth-asc'] = function (a, b) {  
        var x = 0;
        var y = 0;
        
        x = bw_stringToInt(a);
        y = bw_stringToInt(b);
        
        
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['bandwidth-desc'] = function (a, b) {
        var x = 0;
        var y = 0;
        
        x = bw_stringToInt(a);
        y = bw_stringToInt(b);
        
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };
    jQuery.fn.dataTableExt.oSort['volume-asc'] = function (a, b) {  
        var x = -1;
        var y = -1;
        
        if (a == "--") {
            x = 0;
        } else {
            var tab = a.split(" ");
            if (tab[1] == "o") x = tab[0];
            if (tab[1] == "Ko") x = tab[0]*1024;
            if (tab[1] == "Mo") x = tab[0]*1048576;
            if (tab[1] == "Go") x = tab[0]*1073741824;
        }
        
        if (b == "--") {
            y = 0;
        } else {
            var tab = b.split(" ");
            if (tab[1] == "o") y = tab[0];
            if (tab[1] == "Ko") y = tab[0]*1024;
            if (tab[1] == "Mo") y = tab[0]*1048576;
            if (tab[1] == "Go") y = tab[0]*1073741824;
        }
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['volume-desc'] = function (a, b) {
        var x = -1;
        var y = -1;
        
        if (a == "--") {
            x = 0;
        } else {
            var tab = a.split(" ");
            if (tab[1] == "o") x = tab[0];
            if (tab[1] == "Ko") x = tab[0]*1024;
            if (tab[1] == "Mo") x = tab[0]*1048576;
            if (tab[1] == "Go") x = tab[0]*1073741824;
        }
        
        if (b == "--") {
            y = 0;
        } else {
            var tab = b.split(" ");
            if (tab[1] == "o") y = tab[0];
            if (tab[1] == "Ko") y = tab[0]*1024;
            if (tab[1] == "Mo") y = tab[0]*1048576;
            if (tab[1] == "Go") y = tab[0]*1073741824;
        }
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['pc-asc'] = function (a, b) {  
        var x;
        var y;
        
        var tab = a.split("%");
        x = tab[0];
        
        var tab = b.split("%");
        y = tab[0];
        
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    };

    jQuery.fn.dataTableExt.oSort['pc-desc'] = function (a, b) {
        var x;
        var y;
        
        var tab = a.split(" ");
        x = tab[0];
        
        var tab = b.split(" ");
        y = tab[0];
        
        return ((x < y) ? 1 : ((x > y) ? -1 : 0));
    };

    function convertByte(num) {
        // Byte in Octect
        //num = num / 8;

        if (num > 1099511627776) {
            num = Math.round((num / 1099511627776), 1) + " To";
        } else if (num > 1073741824) {
            num = Math.round((num / 1073741824), 1) + " Go";
        } else if (num > 1048576) {
            num = Math.round((num / 1048576), 1) + " Mo";
        } else if (num > 1024) {
            num = Math.round((num / 1024), 1) + " Ko";
        } else if (num > 0) {
            num = Math.round(num, 1) + " o";
        } else {
            num = "0";
        }


        return num;
    }

    function roundNumber(num, dec) {
        var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
        return result;
    }



    function readData() {
        $.ajax({
            url: "/cgi-bin/wtBRMon",
            async: false,
            dataType: 'json',
            success: function (data) {
                datas_qos = data.data.QOS;
                datas_hosts = data.data.arp;
                datas_bw = data.data.bandwidth;
                datas_hostnames = data.data.leases;
                //console.log(datas_hostnames["192.168.1.11"]);
            }
        });

    }

    function readHosts() {
        
        $.each(datas_hosts, function (key, val) {
            if (bw.hasOwnProperty(val.IP)) {
                bw[val.IP] = {"NAME": datas_hostnames[val.IP], "CON": 0, "DL": 0, "UP": 0, "IP": val.IP, "MAC": val.MAC, "PREV_TIME": bw[val.IP]["CURRENT_TIME"], "CURRENT_TIME": 0, "OLD_DL": bw[val.IP]["DL"], "OLD_UP": bw[val.IP]["UP"]};
            } else {
                bw[val.IP] = {"NAME" : datas_hostnames[val.IP], "CON": 0, "DL": 0, "UP": 0, "IP": val.IP, "MAC": val.MAC, "PREV_TIME": 0, "CURRENT_TIME": 0, "OLD_DL": 0, "OLD_UP": 0};
            }
            myhosts.push(val.IP);
        });
    }
    
    function readQOS() {
        var val = datas_qos[0];
        max_DL = val["QOS_DL"];
        max_UP = val["QOS_UP"];
    }

    function readBw() {
        readData();
        readHosts();
        readQOS();

        $.each(datas_bw, function (key, val) {
            var id_host = jQuery.inArray(val.SRC, myhosts);

            // Si l'élement existe : contexte DL
            if (id_host > -1) {
                bw[val.SRC]["CURRENT_TIME"] = val.CURRENT_TIME;
                bw[val.SRC]["CON"]++;
                bw[val.SRC]["UP"] += val.BYTE;

            } else { // Sinon, on vérifie quand même que nous sommes bien dans un contexte de UP
                id_host = jQuery.inArray(val.DST, myhosts);
                if (id_host > -1) {
                    bw[val.DST]["CURRENT_TIME"] = val.CURRENT_TIME;
                    bw[val.DST]["CON"]++;
                    bw[val.DST]["DL"] += val.BYTE;
                } else {
                    console.log("erreur : " + val.SRC + " - " + val.DST);
                }
            }
        });

        // Construction tableau simple pour la datatable
            curr_bw = [];
            total_DL_BW     = 0;
            total_UP_BW     = 0;
            total_DL        = 0;
            total_UP        = 0;
            total_PC_DL_BW  = 0;
            total_PC_UP_BW  = 0;
            
            $.each(bw, function (key, val) {
                var up = convertByte((val.UP - val.OLD_UP) / (val.CURRENT_TIME - val.PREV_TIME));
                    if (up == 0) {up = "--";}
                    else {up += "/s";}

                var dl = convertByte((val.DL - val.OLD_DL) / (val.CURRENT_TIME - val.PREV_TIME));
                    if (dl == 0) {dl = "--";}
                    else {dl += "/s";}

                var pc_dl = Math.round(  (( ((val.DL - val.OLD_DL) / (val.CURRENT_TIME - val.PREV_TIME))/1204) / (max_DL / 8) * 100),2) + "%";
                var pc_up = Math.round(  (( ((val.UP - val.OLD_UP) / (val.CURRENT_TIME - val.PREV_TIME))/1204) / (max_UP / 8) * 100),2) + "%";
                
                // On ajoute l'enregistrement dans la tableau de la datatable
                    var hostname = datas_hostnames[0][val.IP];
                    if (hostname == undefined) hostname = "--";
                    //console.log(hostname);
                    curr_bw.push([hostname, val.IP, dl, up, pc_dl, pc_up, convertByte(val.DL), convertByte(val.UP)]);
                
                // Calcul des totaux
                    total_DL_BW     +=  bw_stringToInt(dl);
                    total_UP_BW     +=  bw_stringToInt(up);
                    total_PC_DL_BW  +=  Math.round(  (( ((val.DL - val.OLD_DL) / (val.CURRENT_TIME - val.PREV_TIME))/1204) / (max_DL / 8) * 100),2);
                    total_PC_UP_BW  +=  Math.round(  (( ((val.UP - val.OLD_UP) / (val.CURRENT_TIME - val.PREV_TIME))/1204) / (max_UP / 8) * 100),2);
                    total_DL        +=  bw_stringToInt(dl);
                    total_UP        +=  bw_stringToInt(dl);
            });

            // Mise à jour de la page
                $("#dl_total_bw").text(convertByte(total_DL_BW)+"/s");
                $("#up_total_bw").text(convertByte(total_UP_BW)+"/s");
                
                $("#pb_bw_dl").width(total_PC_DL_BW + "%");
                $("#pb_bw_dl").text(total_PC_DL_BW + "%");
                
                
                if (total_PC_DL_BW < val_warning) {
                    $("#pb_bw_dl").removeClass('progress-bar-info');
                    $("#pb_bw_dl").removeClass('progress-bar-warning');
                    $("#pb_bw_dl").removeClass('progress-bar-danger');
                    $("#pb_bw_dl").addClass('progress-bar-info');
                    
                } else if (total_PC_DL_BW < val_danger) {
                    $("#pb_bw_dl").removeClass('progress-bar-info');
                    $("#pb_bw_dl").removeClass('progress-bar-warning');
                    $("#pb_bw_dl").removeClass('progress-bar-danger');
                    $("#pb_bw_dl").addClass('progress-bar-warning');
                    
                } else {
                    $("#pb_bw_dl").removeClass('progress-bar-info');
                    $("#pb_bw_dl").removeClass('progress-bar-warning');
                    $("#pb_bw_dl").removeClass('progress-bar-danger');
                    $("#pb_bw_dl").addClass('progress-bar-danger');
                    
                }
                
                $("#pb_bw_up").width(total_PC_UP_BW+ "%");
                $("#pb_bw_up").text(total_PC_UP_BW + "%");
                
                if (total_PC_UP_BW < val_warning) {
                    $("#pb_bw_up").removeClass('progress-bar-info');
                    $("#pb_bw_up").removeClass('progress-bar-warning');
                    $("#pb_bw_up").removeClass('progress-bar-danger');
                    $("#pb_bw_up").addClass('progress-bar-info');
                    
                } else if (total_PC_UP_BW < val_danger) {
                    $("#pb_bw_up").removeClass('progress-bar-info');
                    $("#pb_bw_up").removeClass('progress-bar-warning');
                    $("#pb_bw_up").removeClass('progress-bar-danger');
                    $("#pb_bw_up").addClass('progress-bar-warning');
                    
                } else {
                    $("#pb_bw_up").removeClass('progress-bar-info');
                    $("#pb_bw_up").removeClass('progress-bar-warning');
                    $("#pb_bw_up").removeClass('progress-bar-danger');
                    $("#pb_bw_up").addClass('progress-bar-danger');
                    
                }
        //console.log(curr_bw);
        // Mise à jour de la table
            table.clear();
            table.rows.add(curr_bw);
            table.draw();
    }

    var table = $('#bw_table').DataTable({
        data: curr_bw,
        "aoColumns": 
        [
            null,
            null,
            { "sType": "bandwidth"  },
            { "sType": "bandwidth"  },
            { "sType": "pc"         },
            { "sType": "pc"         },
            { "sType": "volume"     },
            { "sType": "volume"     }
        ]
    });
    
    readBw();  
    setInterval(readBw, refresh);
});
