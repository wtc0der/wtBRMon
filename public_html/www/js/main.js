$(document).ready(function () {
    // Limite couleurs progress bar
        var val_warning = 75;
        var val_danger  = 85;
        var refresh = 5000;
        var prefer_average = true;
        
        // Pour le lissage des progress bar
            var pb_old_bw_dl_pc     = 1;
            var pb_old_bw_up_pc     = 1;
            var pb_old_bw_dl_val    = 1;
            var pb_old_bw_up_val    = 1;
    
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
    
    function bw_stringToInt (str) {
        var x = -1;
        str = str.toString();
       
        if (!str) return 0;
        
        if (str == "--") {
            x = 0;
        } else {
            var tab = str.split(" ");
            if (tab[1] == "o/s") x = tab[0];
            else if (tab[1] == "Ko/s") x = tab[0]*1024;
            else if (tab[1] == "Mo/s") x = tab[0]*1048576;
            else if (tab[1] == "Go/s") x = tab[0]*1073741824;
            else x = 0;
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
            num = roundNumber((num / 1099511627776), 3) + " To";
        } else if (num > 1073741824) {
            num = roundNumber((num / 1073741824), 2) + " Go";
        } else if (num > 1048576) {
            num = roundNumber((num / 1048576), 2) + " Mo";
        } else if (num > 1024) {
            num = roundNumber((num / 1024), 1) + " Ko";
        } else if (num > 0) {
            num = Math.round(num) + " o";
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
                datas_qos       = data.data.QOS;
                datas_hosts     = data.data.arp;
                datas_bw        = data.data.bandwidth;
                datas_hostnames = data.data.leases;
                
                readHosts();
                readQOS();
                readBw();
            },
            error : function(resultat, statut, erreur){
                //console.log("Erreur lecture flux json");
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
        
        // Protection division par 0 en cas d'erreur de lecture du flux json
        if (val["QOS_DL"] > 0) max_DL = roundNumber(val["QOS_DL"] / 8 * 1024, 2);
        if (val["QOS_UP"] > 0) max_UP = roundNumber(val["QOS_UP"] / 8 * 1024, 2);
        //console.log(max_DL);
    }

    function readBw() {
        
        // Lecture de la liste des connexions, on incrémente le tableau bw
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
                    //console.log("erreur : " + val.SRC + " - " + val.DST);
                }
            }
        });

        // Construction tableau simple pour la datatable
            curr_bw = [];
            total_DL_BW     = 0;
            total_UP_BW     = 0;
            total_PC_DL_BW  = 0;
            total_PC_UP_BW  = 0;
            
            // Pour chaque host :
            $.each(bw, function (key, val) {
                
                // Calcul des données envoyées depuis le dernier appel
                    var up = convertByte((val.UP - val.OLD_UP) / (val.CURRENT_TIME - val.PREV_TIME));
                    if (up === 0) {up = "--";}
                    else {up += "/s";}

                // Calcul des données reçues depuis le dernier appel
                    var dl = convertByte((val.DL - val.OLD_DL) / (val.CURRENT_TIME - val.PREV_TIME));
                    if (dl === 0) {dl = "--";}
                    else {dl += "/s";}
                
                // Calcul du pourcentage de bande passante utilisé en reception
                    var val_pc_dl = roundNumber(  (( ((val.DL - val.OLD_DL) / (val.CURRENT_TIME - val.PREV_TIME))) / (max_DL) * 100),2);
                    var pc_dl = val_pc_dl + "%";

                // Calcul du pourcentage de bande passante utilisé en emission
                    var val_pc_up = roundNumber(  (( ((val.UP - val.OLD_UP) / (val.CURRENT_TIME - val.PREV_TIME))) / (max_UP) * 100),2);
                    var pc_up = val_pc_up + "%";
                
                // On rapproche le nom d'hote à l'adresse IP
                    var hostname = datas_hostnames[0][val.IP];
                    if (hostname === undefined) hostname = "--";

                // On ajoute l'enregistrement dans la tableau de la datatable
                    curr_bw.push([hostname, val.IP, dl, up, pc_dl, pc_up, convertByte(val.DL), convertByte(val.UP)]);
                
                // On incrémente les totaux                   
                    total_DL_BW     +=  bw_stringToInt(dl);
                    total_UP_BW     +=  bw_stringToInt(up);
                    total_PC_DL_BW  +=  val_pc_dl;
                    total_PC_UP_BW  +=  val_pc_up;
            });
            
            // Lissage : moyenne sur les valeurs en cours et les précédentes
                if (prefer_average === true) {
                    total_DL_BW     =  roundNumber((total_DL_BW + pb_old_bw_dl_val) / 2,2);
                    total_UP_BW     =  roundNumber((total_UP_BW + pb_old_bw_up_val) / 2,2);

                    total_PC_DL_BW  = roundNumber((total_PC_DL_BW + pb_old_bw_dl_pc) / 2,1); 
                    total_PC_UP_BW  = roundNumber((total_PC_UP_BW + pb_old_bw_up_pc) / 2,1); 

                    pb_old_bw_dl_pc     = total_PC_DL_BW;
                    pb_old_bw_up_pc     = total_PC_UP_BW;
                    pb_old_bw_dl_val    = total_DL_BW;
                    pb_old_bw_up_val    = total_UP_BW;
                } 
            

            // Mise à jour de la page
                
                $("#dl_total_bw").text(convertByte(total_DL_BW) + "/s");
                $("#up_total_bw").text(convertByte(total_UP_BW) + "/s");
                
            //-----------------------    
            // Progress Bar Reception
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
            
            //-----------------------
            // Progress Bar Emission
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

        // Mise à jour de la datatable
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
    
    readData();  
    setInterval(readData, refresh);
});
