describe("S4 Unit Tests", function() {
    "use strict";
    const {assert} = chai;
    const {strictEqual: eq} = assert;

    const kut = [
        {ph:"x3FlGQZI",ek:"ARcxSsSNtqu7vCFnucb53A",ak:"AKIAEY4RMZHDUOIYLHESAZEZ52G66JXSQPSLK3UX4LRH",ou:"jadbszlry4aromkkysg3nk53xqqwpoog7hoc4"},
        {ph:"m1JDVK5K",ek:"ARcxSsSNtqu7vCFnucb53A",ak:"AKIA7BZMQLZ55BH44QWZ3ABEBIYAXGZ4XLJGVP7J4ZPZ",ou:"jkxfiq2stmaromkkysg3nk53xqqwpoog7hocc"},
        {ph:"x3FlGQZI",ek:"r2rhd-uBO30Oo4oNliHvQl",ak:"AKIAM2JCRDZCPHZILR23IP2V7WJGXKA75UE5XA7ZN6GJ",ou:"jadbszlry6xwvylx5oatw7iouofa3frb55bpq"},
        {ph:"m1JDVK5K",ek:"r2rhd-uBO30Oo4oNliHvQl",ak:"AKIAHVBHGX3ZVGUVLHELDASQICL5NLMINRTLYCZ7GKES",ou:"jkxfiq2stoxwvylx5oatw7iouofa3frb55bpo"},
        {ph:"x3FlGQZI",ek:"tjPoJGlXTcaKJDVDQvHQJ7",ak:"AKIAAD6V52W7TH5QQPHKQOG7IP3G5H7MRL5LY4EZVTVW",ou:"jadbszlry63dh2benflu3rukeq2ugqxr2atxo"},
        {ph:"m1JDVK5K",ek:"tjPoJGlXTcaKJDVDQvHQJ7",ak:"AKIA5FNLOTJWHYJK7VKNNIVB3GEPJYK4OCZKBXZE22K7",ou:"jkxfiq2sto3dh2benflu3rukeq2ugqxr2atxq"},
        {ph:"x3FlGQZI",ek:"V-UGsoBJZ640uNGfxlHX8d",ak:"AKIAX6NO5TLIG2H5DXGHHHQC4LR7R2QHT4I2TG4PU77I",ou:"jadbszlry5l6kbvsqbewplruxdiz7rsr27yzo"},
        {ph:"m1JDVK5K",ek:"V-UGsoBJZ640uNGfxlHX8d",ak:"AKIARWU5Z7S2AW66F3XUBPJRYHINXWIOFDQPRDL7MTG2",ou:"jkxfiq2stnl6kbvsqbewplruxdiz7rsr27yzq"},
        {ph:"x3FlGQZI",ek:"mdsDY_ftHA3nSwbfFBmJBg",ak:"AKIAAMOZTJLNFODMW7MNTQMY5XYTYDJMBA5D5MA6XRU2",ou:"jadbszlry6m5wa3d67wrydphjmdn6fazredlw"},
        {ph:"m1JDVK5K",ek:"mdsDY_ftHA3nSwbfFBmJBg",ak:"AKIAN6IPKKABU3VEMEIA6CKOEUT7JW6OLIQIUTILSS7W",ou:"jkxfiq2stom5wa3d67wrydphjmdn6fazredli"},
        {ph:"x3FlGQZI",ek:"jUMgFfDNI12BEaMwUf8XTb",ak:"AKIAJT2ODIRRPLROUQFGMKDZASGW7KE3DWGSWBYPRN6B",ou:"jadbszlry6gugiav6dgsgxmbcgrtaup7c5gtn"},
        {ph:"m1JDVK5K",ek:"jUMgFfDNI12BEaMwUf8XTb",ak:"AKIA4YOEWSU3SJEAF2SOZBXTVID4CIQ7CPY4HHCGYX3L",ou:"jkxfiq2stogugiav6dgsgxmbcgrtaup7c5gtt"},
        {ph:"x3FlGQZI",ek:"T6GkH46Vlp19VGokg9liK2",ak:"AKIAASBO6PGFW3O34NTXEED4R6RJBABSKUSGHLSEOI2L",ou:"jadbszlry5h2dja7r2kznhl5krvcja6zmivr6"},
        {ph:"m1JDVK5K",ek:"T6GkH46Vlp19VGokg9liK2",ak:"AKIATRUXPV25LVCVLLU4XHWFAENR4OMWNB4LQFJ6DSGT",ou:"jkxfiq2stnh2dja7r2kznhl5krvcja6zmivra"},
        {ph:"x3FlGQZI",ek:"JiypO6Mthsz0cH4iopXpy4",ak:"AKIAF4Y2AJVKGCH5D7LNO472XCHA2ZARWEDYPDNH4HIJ",ou:"jadbszlry4tczkj3umwynthuob7cfiuv5hf2c"},
        {ph:"m1JDVK5K",ek:"JiypO6Mthsz0cH4iopXpy4",ak:"AKIA5ELWMADMCZE7OO2LWEMW3LRG6CCZLG3YTWQIMO6P",ou:"jkxfiq2stmtczkj3umwynthuob7cfiuv5hf24"},
        {ph:"x3FlGQZI",ek:"7nonwaWGcr0agOg4HOwHOZ",ak:"AKIASQGV3NW76EEMUYHXSJHWNG35JYZHCYYSBOYH2532",ou:"jadbszlry7xhuj6buwdhfpi2qdudqhhma44zz"},
        {ph:"m1JDVK5K",ek:"7nonwaWGcr0agOg4HOwHOZ",ak:"AKIATNHFF5OQWIDYS35UTUGGTWDSBU7ZUILXE6XUYNDV",ou:"jkxfiq2stpxhuj6buwdhfpi2qdudqhhma44zh"},
        {ph:"x3FlGQZI",ek:"aSHOIrDGvK5k-1KgHyXIYD",ak:"AKIALCN77GEBPSGRIVKBMMNC5H7Z3J43YKG7IB6VRORR",ou:"jadbszlry5usdtrcwddlzlte7njkahzfzbqpp"},
        {ph:"m1JDVK5K",ek:"aSHOIrDGvK5k-1KgHyXIYD",ak:"AKIAIM5OIOM23WLLKTXAPC5TKPXCPNQLK7SYPCAH2GZK",ou:"jkxfiq2stnusdtrcwddlzlte7njkahzfzbqpr"},
        {ph:"x3FlGQZI",ek:"iEH2eEJ4pvX8JrzY9vuDf4",ak:"AKIAWX74XRT7Y2NUXQMYQFTMWRN6YF23QJG3JR4UTPR5",ou:"jadbszlry6eed5tyij4kn5p4e26nr5x3qn75m"},
        {ph:"m1JDVK5K",ek:"iEH2eEJ4pvX8JrzY9vuDf4",ak:"AKIAZYTLAHYED7QJFOSB7K73BHGFDAGMSERECT6AYZ2G",ou:"jkxfiq2stoeed5tyij4kn5p4e26nr5x3qn75s"},
        {ph:"x3FlGQZI",ek:"E1kYzHsXWanqcS6xWvs53B",ak:"AKIAHOLTAAST3FYWPQV7AZ7XENIRCJQMQMNLLEEW5TRI",ou:"jadbszlry4jvsggmpmlvtkpkoexlcwx3hhogd"},
        {ph:"m1JDVK5K",ek:"E1kYzHsXWanqcS6xWvs53B",ak:"AKIAFMYCBJKDPZQ4BUQYC3MGFEQBWVZMO3BKNLZEA2JY",ou:"jkxfiq2stmjvsggmpmlvtkpkoexlcwx3hhog5"},
        {ph:"x3FlGQZI",ek:"w3l6ygJdkZeV9do1ALczBE",ak:"AKIAP52MNR56KAWZUKPYMY4LZOUPBH2AXJLIZXFP2DN4",ou:"jadbszlry7bxs6wkajozdf4v6xndkafxgmcfu"},
        {ph:"m1JDVK5K",ek:"w3l6ygJdkZeV9do1ALczBE",ak:"AKIA7HNEA2JY72VTJL2W4CLDUFAJU5YA23XANA4ELIZ2",ou:"jkxfiq2stpbxs6wkajozdf4v6xndkafxgmcfk"},
        {ph:"x3FlGQZI",ek:"RHC0C65FI2I58GlRvW2Z3A",ak:"AKIAMVSJKH4PKEBHMGHEJBCZY6NYZBUREODRKDJUMFBB",ou:"jadbszlry5chbnalvzcsgyrz6buvdplnthodn"},
        {ph:"m1JDVK5K",ek:"RHC0C65FI2I58GlRvW2Z3A",ak:"AKIAT5HG6NLVPP4FZYWOWJXWMU2C4KIZBD35RGSYEPW3",ou:"jkxfiq2stnchbnalvzcsgyrz6buvdplnthodt"},
        {ph:"x3FlGQZI",ek:"CrBOCpOP6riIrwOxCizWo7",ak:"AKIAMQ5SBAP5ASCDHZRENU5GJJ5YFATI257OD5GGLC3O",ou:"jadbszlry4flatqksoh6voeiv4b3ccrm22rti"},
        {ph:"m1JDVK5K",ek:"CrBOCpOP6riIrwOxCizWo7",ak:"AKIAQBRMJWAZLVQGUAT5RFRYB7S4OHAHZXUR3BE37UUK",ou:"jkxfiq2stmflatqksoh6voeiv4b3ccrm22rtw"},
        {ph:"x3FlGQZI",ek:"pZYk7aK-mY20zEpNgvEOD8",ak:"AKIAZEQEQW6OBD2TXWD2E3564R3CXESLA5OTDVYVXNTM",ou:"jadbszlry6szmjhnuk7jtdnuzrfe3axrbyhtp"},
        {ph:"m1JDVK5K",ek:"pZYk7aK-mY20zEpNgvEOD8",ak:"AKIAWSDDL7NTV2EJ3JO4LNOZHYI7D5N34RKTIOFRQEAR",ou:"jkxfiq2stoszmjhnuk7jtdnuzrfe3axrbyhtr"},
        {ph:"x3FlGQZI",ek:"Le5ZM47A_wmjhtJ348b68a",ak:"AKIA7ZSYVOC5JMWIE4ANAH6DATJJPKNY3SXOUJGLFC6T",ou:"jadbszlry4w64wjtr3ap6cndq3jhpy6g7ly2o"},
        {ph:"m1JDVK5K",ek:"Le5ZM47A_wmjhtJ348b68a",ak:"AKIADN6W7IFYKPEZVFIV4TSNKVOMMJ6D2YWQMQEGTEZW",ou:"jkxfiq2stmw64wjtr3ap6cndq3jhpy6g7ly2q"},
        {ph:"x3FlGQZI",ek:"Kxz2tER8MomRN_VULgR9P-",ak:"AKIA3W3QAH5S27CCEZ44AP75RL4LSS7K336OQ5WMPK7W",ou:"jadbszlry4vrz5vuir6dfcmrg72vilqepu7x4"},
        {ph:"m1JDVK5K",ek:"Kxz2tER8MomRN_VULgR9P-",ak:"AKIAG3OOW5CZXQXUTDHX5CKDHRDA75LW4SMDJ5NRFQA5",ou:"jkxfiq2stmvrz5vuir6dfcmrg72vilqepu7xc"},
        {ph:"x3FlGQZI",ek:"3kB7soB0PXyOare3z2rmTE",ak:"AKIAXIRR7UPEC5MR72QJ2PKKWCMCF4WGK7IGCWSHQY3E",ou:"jadbszlry7pea65sqb2d27eonk33pt3k4zgmx"},
        {ph:"m1JDVK5K",ek:"3kB7soB0PXyOare3z2rmTE",ak:"AKIAEFCIJNT7ODBHQ4LOJCZTA3QZJC22VK2HVWP52BH7",ou:"jkxfiq2stppea65sqb2d27eonk33pt3k4zgmj"},
        {ph:"x3FlGQZI",ek:"x0kIgBS7LVsYckNploMjCy",ak:"AKIA3DRROKQLCEZPCB6YLTBYSKJ4UFL2YBWPNZWUJKQ7",ou:"jadbszlry7dusceacs5s2wyyojbwtfudemf4l"},
        {ph:"m1JDVK5K",ek:"x0kIgBS7LVsYckNploMjCy",ak:"AKIAN2I2CWF5MOCIHMNK5KYT6W4K2PRXN7M37NB4ZWFJ",ou:"jkxfiq2stpdusceacs5s2wyyojbwtfudemf4v"},
        {ph:"x3FlGQZI",ek:"at1ZvsLP8IPtd867DSc72E",ak:"AKIAQMBLAYJLCAMVYBFIE5SOJ6GSA6Q5T4F2TAMLRX7J",ou:"jadbszlry5vn2wn6ylh7ba7no7hlwdjhhpmj7"},
        {ph:"m1JDVK5K",ek:"at1ZvsLP8IPtd867DSc72E",ak:"AKIA4VI5MMSNIN7Q6YX3IE3YFK5UKTCSFW6P3UL6BDEP",ou:"jkxfiq2stnvn2wn6ylh7ba7no7hlwdjhhpmjb"},
        {ph:"x3FlGQZI",ek:"sP5dDRMSQyLRXGKvhSD9Ls",ak:"AKIACKMP625ROTQUI4Z2YDESORS7JDVGBOYD2OQY6ZVC",ou:"jadbszlry6yp4xincmjegiwrlrrk7bja7uxi2"},
        {ph:"m1JDVK5K",ek:"sP5dDRMSQyLRXGKvhSD9Ls",ak:"AKIAJ57KFDPMSK6KELW4TUXXVIACV22S5K6DVUN6ZAH7",ou:"jkxfiq2stoyp4xincmjegiwrlrrk7bja7uxie"},
        {ph:"x3FlGQZI",ek:"FSzUwbcyrUOw9dOV7qTSH2",ak:"AKIASLUVGBBQ64VIMNZQKRIGSYKV3LH4HHVA6YBL7RMH",ou:"jadbszlry4kszvgbw4zk2q5q6xjzl3ve2ipxz"},
        {ph:"m1JDVK5K",ek:"FSzUwbcyrUOw9dOV7qTSH2",ak:"AKIAUTTWKCQG7EOIQAJ6MJPF633D2T5WLZMI4NILPS5R",ou:"jkxfiq2stmkszvgbw4zk2q5q6xjzl3ve2ipxh"},
        {ph:"x3FlGQZI",ek:"ldxS8BbT5sx5Ntg1sYVGUe",ak:"AKIAUTDGH2RHZHL5MSBM5EXYBH3XJN4RYKD7IDOQ4GRR",ou:"jadbszlry6k5yuxqc3j6ntdzg3mdlmmfizi42"},
        {ph:"m1JDVK5K",ek:"ldxS8BbT5sx5Ntg1sYVGUe",ak:"AKIAVOHWZIZIQDMJ6R3F4ZTI7VTYAJ2P22QQNTED6UZ6",ou:"jkxfiq2stok5yuxqc3j6ntdzg3mdlmmfizi4e"},
        {ph:"x3FlGQZI",ek:"vu_3keV4gGhelprMJwFG1e",ak:"AKIA4KEKX5VZD7OA6AXRY2VXWZQ2WIKGCRICFWQD6Z24",ou:"jadbszlry67o754r4v4ia2c6s2nmyjybi3k4r"},
        {ph:"m1JDVK5K",ek:"vu_3keV4gGhelprMJwFG1e",ak:"AKIAKD6RTAYLNJXHVMEEOTPMSE5IY6SLZOSRXSE3GEXO",ou:"jkxfiq2sto7o754r4v4ia2c6s2nmyjybi3k4p"},
        {ph:"x3FlGQZI",ek:"Aif4GAKmqFh1IRfqVL8D1t",ak:"AKIACYROYHIWUO6F2YJEAPXUBOQX2NOAGDLAMXBBABIU",ou:"jadbszlry4bcp6ayaktkqwdveel6uvf7apldj"},
        {ph:"m1JDVK5K",ek:"Aif4GAKmqFh1IRfqVL8D1t",ak:"AKIA2STS5GGUEZ7NRI5BYFVIEP6VK2OC5AWDQQN6ZAGW",ou:"jkxfiq2stmbcp6ayaktkqwdveel6uvf7apldx"},
        {ph:"x3FlGQZI",ek:"4sGNpXgqBsYswq4GduXKvs",ak:"AKIATRCPGIAGV54EGUSH2CBQQYFUHM3IGZ7AB5BEJBL6",ou:"jadbszlry7rmddnfpavanrrmykxam5xfzk7cu"},
        {ph:"m1JDVK5K",ek:"4sGNpXgqBsYswq4GduXKvs",ak:"AKIA4RLIWMT6XUAFCKSVVCIXA4WMFFGDSUWUKQGAFFYG",ou:"jkxfiq2stprmddnfpavanrrmykxam5xfzk7ck"},
        {ph:"x3FlGQZI",ek:"naiJxqYzkcr22gZiXma7eW",ak:"AKIATWUYTR5GGKI4X5W3AZRV4Z53PBEAOGLEOHDBYAIA",ou:"jadbszlry6o2rcoguyzzdsxw3idgextgxn45q"},
        {ph:"m1JDVK5K",ek:"naiJxqYzkcr22gZiXma7eW",ak:"AKIA5Z37UGOV5TRBLBIFOW6S3OOIUY4XCJ44EFCFDX3T",ou:"jkxfiq2stoo2rcoguyzzdsxw3idgextgxn45o"},
        {ph:"x3FlGQZI",ek:"yiobcLxXDk9x56od5YGxaI",ak:"AKIAZU4RYY53IQEVY5XUVUHOFEVWPNHRKHTWO3KCKEYH",ou:"jadbszlry7fcug3qxrlq4t3r46vb3zmbwfuil"},
        {ph:"m1JDVK5K",ek:"yiobcLxXDk9x56od5YGxaI",ak:"AKIABDQNTOT6TXGILMZNNDLSOS3TUKEGJFUJSBI55SWC",ou:"jkxfiq2stpfcug3qxrlq4t3r46vb3zmbwfuiv"},
        {ph:"x3FlGQZI",ek:"d_2AxcIb-GJytxJqUZadWg",ak:"AKIAZL7T3R37DFCWBT5VV5UOZFBALD2QJJDHZTC7YAV5",ou:"jadbszlry5373agfyin7qytsw4jguumwtvnj7"},
        {ph:"m1JDVK5K",ek:"d_2AxcIb-GJytxJqUZadWg",ak:"AKIABEC74PN44ODJUDCPNSJC63XDUI2FMKV3FRRQD6D6",ou:"jkxfiq2stn373agfyin7qytsw4jguumwtvnjb"},
        {ph:"x3FlGQZI",ek:"jKJpubmUvPfxccZwDjCYh7",ak:"AKIAVSOUTBUZVOOMRUKO4ZHS4D5YXBUDSOK2KH4D4PZA",ou:"jadbszlry6gke2nzxgklz57rohdhadrqtcd3k"},
        {ph:"m1JDVK5K",ek:"jKJpubmUvPfxccZwDjCYh7",ak:"AKIAUVPUAREQNGKQVWEM56GSPTNRPJRVG7N6PNTAT7JJ",ou:"jkxfiq2stogke2nzxgklz57rohdhadrqtcd3u"},
        {ph:"x3FlGQZI",ek:"V3x1cXe-DOVZDPA1w8Qb54",ak:"AKIAVMSYSKEL47YLZJKVBRWD7HPHX22F7ZJ4RWPKUWP4",ou:"jadbszlry5lxy5lro67azzkzbtydlq6edptur"},
        {ph:"m1JDVK5K",ek:"V3x1cXe-DOVZDPA1w8Qb54",ak:"AKIAH2CBZCI6IZSR2MHUTHG2UPDSD4RVMPN3HNRQD6DJ",ou:"jkxfiq2stnlxy5lro67azzkzbtydlq6edptup"},
        {ph:"x3FlGQZI",ek:"Ef0TOC48JZ_GbnqFx5fSeu",ak:"AKIAFSGS4SATJQMO76Y6I727VZ7PBJ2XMJAVJS3WU4B5",ou:"jadbszlry4i72ezyfy6clh6gnz5ilr4x2j5kr"},
        {ph:"m1JDVK5K",ek:"Ef0TOC48JZ_GbnqFx5fSeu",ak:"AKIAUS62M6E3PSIN64ZOZ7CXFV3HHL765YID47N5YQFV",ou:"jkxfiq2stmi72ezyfy6clh6gnz5ilr4x2j5kp"},
        {ph:"x3FlGQZI",ek:"urvqzMR4QhjRB-fFG1qRHR",ak:"AKIACNJUGJDNSDV7A6HPJYW3FMRY6XQ65MEN3AX6X2FJ",ou:"jadbszlry65lx2wmyr4eeggra7t4kg22seo47"},
        {ph:"m1JDVK5K",ek:"urvqzMR4QhjRB-fFG1qRHR",ak:"AKIAFKMHV32ULPJDWQJEO7TIW6IBH3NI3RDAYK4OYI4Q",ou:"jkxfiq2sto5lx2wmyr4eeggra7t4kg22seo4b"},
        {ph:"x3FlGQZI",ek:"E9jBDOgtJakEQjcto5bXWo",ak:"AKIABFDNXEXSWM7TOHW4FWZ3SCGNYRJJQA73NNMQNHQ2",ou:"jadbszlry4j5rqim5awslkieii3s3i4w25nkl"},
        {ph:"m1JDVK5K",ek:"E9jBDOgtJakEQjcto5bXWo",ak:"AKIANNPLTCUQVNOS67GEJ6V5WEFP3QZCQLGFFIOVVBTY",ou:"jkxfiq2stmj5rqim5awslkieii3s3i4w25nkv"},
        {ph:"x3FlGQZI",ek:"hB5zCvQWNgf8uuWaorAY8c",ak:"AKIAYJRTK55SNNYHVOWHUPT6JTK6RQHHWXYYG65AA7KG",ou:"jadbszlry6cb44yk6qldmb74xlszvivqddyvw"},
        {ph:"m1JDVK5K",ek:"hB5zCvQWNgf8uuWaorAY8c",ak:"AKIAK2B2DFZGRPSJULRHG4DXALOKNSMDHBW6QADKVHOS",ou:"jkxfiq2stocb44yk6qldmb74xlszvivqddyvi"},
        {ph:"x3FlGQZI",ek:"IkV8p8fLwNZ1MnxpJKV1SP",ak:"AKIA5HD3OJIMJEFVJPVQW7V66J56ZKBYJUXHXJCZ7AWL",ou:"jadbszlry4rek7fhy7f4bvtvgj6gsjffovemd"},
        {ph:"m1JDVK5K",ek:"IkV8p8fLwNZ1MnxpJKV1SP",ak:"AKIASPA42I3WJ5YVFRFWZXWZKIOEZT5SVZOH4MP5XBFR",ou:"jkxfiq2stmrek7fhy7f4bvtvgj6gsjffovem5"},
        {ph:"x3FlGQZI",ek:"v01jsBI0pckLkaTPxQoWRB",ak:"AKIA5JXDNE2HC7YOUXVS6HWJAKKDM4OSKTCGETSHEI2V",ou:"jadbszlry67u2y5qci2klsilsgsm7rikczcb3"},
        {ph:"m1JDVK5K",ek:"v01jsBI0pckLkaTPxQoWRB",ak:"AKIAAP656AFOQQMXTNZBDB7XTOVK6T3B52HT5YV2LMF4",ou:"jkxfiq2sto7u2y5qci2klsilsgsm7rikczcbf"},
        {ph:"x3FlGQZI",ek:"KO2fkXgCzcD0L7Cf73HrO3",ak:"AKIAY7IHBLEXH4RP2GYSL6RAATAEA2TTX5SYT35N6PPP",ou:"jadbszlry4uo3h4rpabm3qhuf6yj733r5m5qf"},
        {ph:"m1JDVK5K",ek:"KO2fkXgCzcD0L7Cf73HrO3",ak:"AKIAVY2BSSH63NFRS4XWGZDGTKDN4LGHPUU22RBIRWMG",ou:"jkxfiq2stmuo3h4rpabm3qhuf6yj733r5m5q3"},
        {ph:"x3FlGQZI",ek:"RuTPKHxnUHCWzy6fB5HQ5f",ak:"AKIAG6XL4YQNFUQTVZ4FL7KXNW5BV44UY2BPACGWMSTR",ou:"jadbszlry5dojtziprtva4ewz4xj6b4r2ds2f"},
        {ph:"m1JDVK5K",ek:"RuTPKHxnUHCWzy6fB5HQ5f",ak:"AKIAAVQIZLB74MJ7JVKLNUNUIFMTMEESUF6HCEPWVBCD",ou:"jkxfiq2stndojtziprtva4ewz4xj6b4r2ds23"},
        {ph:"x3FlGQZI",ek:"XHKeLeVlhzfAO1ULp0f3Xe",ak:"AKIA2HERHFTI3YFIYTMA3CYCV7D243C33FG67R6LJO4N",ou:"jadbszlry5ohfhrn4vsyon6ahnkqxj2h65ovr"},
        {ph:"m1JDVK5K",ek:"XHKeLeVlhzfAO1ULp0f3Xe",ak:"AKIAALB4BHF32TMYNHUKBO5PT5VJ5QKB6CXSBQVFTMK6",ou:"jkxfiq2stnohfhrn4vsyon6ahnkqxj2h65ovp"},
        {ph:"x3FlGQZI",ek:"1dJCidenIB7erSIND2MvCm",ak:"AKIAWYASCWVUORB43PL6IHPGZMCM3EV5K6VWCIKDZU3D",ou:"jadbszlry7k5equj26tsahw6vura2d3df4foj"},
        {ph:"m1JDVK5K",ek:"1dJCidenIB7erSIND2MvCm",ak:"AKIAZ3YVTKWMQQ5T3RMOHEXBIQBUFFIY2T3AJG4HUIY3",ou:"jkxfiq2stpk5equj26tsahw6vura2d3df4fox"},
        {ph:"x3FlGQZI",ek:"wi9ljooGSqvo4dRjQlwXPo",ak:"AKIAWQ2RHFH4DQ6LDHX3UJ4TIRTBEQ7BY337A7OT2GTW",ou:"jadbszlry7bc6zmoridevk7i4hkggqs4c47pu"},
        {ph:"m1JDVK5K",ek:"wi9ljooGSqvo4dRjQlwXPo",ak:"AKIALMAPZIITFHJYI4OOJVGNW44OCHJYDTLMZO2OYL4Z",ou:"jkxfiq2stpbc6zmoridevk7i4hkggqs4c47pk"},
        {ph:"x3FlGQZI",ek:"1kBFmZA0L8jUuSJiknYfbd",ak:"AKIANO5PQYZNZ2JDE2KDT6MC7DFCS727ZJE7ZQ6ZD6V5",ou:"jadbszlry7learmzsa2c7sguxergfetwd5wtm"},
        {ph:"m1JDVK5K",ek:"1kBFmZA0L8jUuSJiknYfbd",ak:"AKIA5GBXUWVP64IAX232DWQ23NJAVZ2W224ANVMC3QZ7",ou:"jkxfiq2stplearmzsa2c7sguxergfetwd5wts"},
        {ph:"x3FlGQZI",ek:"I4MkpIIF8J1JanumnFvWmp",ak:"AKIA3J552XD37UEWLMESQJPGLIZPMKY75YE5RA72R6HZ",ou:"jadbszlry4rygjfeqic7bhkjnj52nhc322nia"},
        {ph:"m1JDVK5K",ek:"I4MkpIIF8J1JanumnFvWmp",ak:"AKIAWXNLF7IULRTMJXZT5X7QUASAYPOPPQQ2YTBPSWMW",ou:"jkxfiq2stmrygjfeqic7bhkjnj52nhc322ni6"},
        {ph:"x3FlGQZI",ek:"07Xku8PWlja9UQRoha9ivk",ak:"AKIAIXEHFRSVVMAEWKZMSIKRHUXUYPPHXDYY465NU7MW",ou:"jadbszlry7j3lzf3ypljmnv5kecgrbnpmk7bo"},
        {ph:"m1JDVK5K",ek:"07Xku8PWlja9UQRoha9ivk",ak:"AKIAAOODJEQT75DB63LY2RAVLBVSS6NIPBDKQKZKEKOQ",ou:"jkxfiq2stpj3lzf3ypljmnv5kecgrbnpmk7bq"},
        {ph:"x3FlGQZI",ek:"VqWI7RrtGr0qcvy3Rjn3sH",ak:"AKIAXW4WH4PR6HY2DQLOC6V22JI4VSRRV4TZTLN6SHHL",ou:"jadbszlry5lklchndlwrvpjkol6lorrz66ybn"},
        {ph:"m1JDVK5K",ek:"VqWI7RrtGr0qcvy3Rjn3sH",ak:"AKIA4FKT6HNNDWWU3HMCJND7DSKAID6V5Y5T4VVYX4FX",ou:"jkxfiq2stnlklchndlwrvpjkol6lorrz66ybt"},
        {ph:"x3FlGQZI",ek:"TJ7AvEur0PhXko0biHSi96",ak:"AKIAZYLEENGJENJHBVI2B6JQV7BAP7FI5G7N6NH6JCEC",ou:"jadbszlry5gj5qf4jov5b6cxskgrxcduul3qs"},
        {ph:"m1JDVK5K",ek:"TJ7AvEur0PhXko0biHSi96",ak:"AKIAKVW5ST2SLDEQWTTBSTUJDB53ARJV2TNQJNUED4YZ",ou:"jkxfiq2stngj5qf4jov5b6cxskgrxcduul3qm"},
        {ph:"x3FlGQZI",ek:"d7-6qx-iEd3LqzbkqcAX_w",ak:"AKIAV5EGEXGHKXESUE245YJXCN6PBCIPDQMSVEYPL56Y",ou:"jadbszlry5337ovld6rbdxolvm3ojkoac773p"},
        {ph:"m1JDVK5K",ek:"d7-6qx-iEd3LqzbkqcAX_w",ak:"AKIAI2VYXPZOWYQMT6V7A7YJRVBG5N53UZKXMOHSEFBR",ou:"jkxfiq2stn337ovld6rbdxolvm3ojkoac773r"},
        {ph:"x3FlGQZI",ek:"L_X5S1ob8RiGYYDiGTLKqB",ak:"AKIAPYD2ROIL5GQOVV4T2EIERQE3LIM7ISEXEA2VD4SR",ou:"jadbszlry4x7l6kllin7cgegmgaoegjszkubc"},
        {ph:"m1JDVK5K",ek:"L_X5S1ob8RiGYYDiGTLKqB",ak:"AKIAER27FS2RTP5JRDPBRNRBFMWBFBAS4X6DLENTLAAL",ou:"jkxfiq2stmx7l6kllin7cgegmgaoegjszkub4"},
        {ph:"x3FlGQZI",ek:"JRy_5-iE65Qd_uezWmQE40",ak:"AKIAVFKTHLTEZVT53ENXNP5NMLMIVLCE7FJM7WHLESMM",ou:"jadbszlry4srzp7h5ccoxfa573t3gwteatr36"},
        {ph:"m1JDVK5K",ek:"JRy_5-iE65Qd_uezWmQE40",ak:"AKIA2CYEUSY5FAPDR2CSCIP27SHRJ67QFIPPU437LLHV",ou:"jkxfiq2stmsrzp7h5ccoxfa573t3gwteatr3a"},
        {ph:"x3FlGQZI",ek:"pHi7m6RcHm6Fx_PfQVls-w",ak:"AKIACMVQZSATB6UT2MUUISGPMCW3VD7VLLRWY2KNSU5X",ou:"jadbszlry6shro43urob43ufy7z56qkznt552"},
        {ph:"m1JDVK5K",ek:"pHi7m6RcHm6Fx_PfQVls-w",ak:"AKIA532PCF7O2BKOFT2LXFJQXVJGO4ACEHWPDALRVDCK",ou:"jkxfiq2stoshro43urob43ufy7z56qkznt55e"},
        {ph:"x3FlGQZI",ek:"mpvIbLZgMOz6VmAzOUlUlj",ak:"AKIAAJ4VBDROQKUA4YVU7DI2DK6MOTIOJAMH5ESYLYUY",ou:"jadbszlry6njxsdmwzqdb3h2kzqdgokjkslp3"},
        {ph:"m1JDVK5K",ek:"mpvIbLZgMOz6VmAzOUlUlj",ak:"AKIATGSMWU5VL4Z5H6LJMMGDU5SXVFEZCV34KGSCAPYD",ou:"jkxfiq2stonjxsdmwzqdb3h2kzqdgokjkslpf"},
        {ph:"x3FlGQZI",ek:"gBO8i_0t7mi27JOg1m61sb",ak:"AKIA7KC4MHMHXOKP5TD25E3KZ6GPE4ZJAY7TBNIRPFT2",ou:"jadbszlry6abhpel7uw642fw5sj2bvtowwyt6"},
        {ph:"m1JDVK5K",ek:"gBO8i_0t7mi27JOg1m61sb",ak:"AKIA3JGONVFHOK2DP3FTZH7YYMPP5YIPCDQ4BDCASX22",ou:"jkxfiq2stoabhpel7uw642fw5sj2bvtowwyta"},
        {ph:"x3FlGQZI",ek:"n5aBZMiK7OXVWGhW_oItrP",ak:"AKIAV26LATXZUDO47ZDSLF6M7KA4QZ4SYKCPIDWTOKRR",ou:"jadbszlry6pznalezcfozzovlbufn7ucfwweu"},
        {ph:"m1JDVK5K",ek:"n5aBZMiK7OXVWGhW_oItrP",ak:"AKIALLWEIHQN6AUZ6EBCVUWDX6HI22H5JEJZS7Q726WF",ou:"jkxfiq2stopznalezcfozzovlbufn7ucfwwek"},
        {ph:"x3FlGQZI",ek:"CF7E3BFvp40PFZnzwuNTQv",ak:"AKIAKF5Z36KIJL7KQVRQYDLJXRQKM4ISGQCAFDRDUJKZ",ou:"jadbszlry4ef5rg4cfx2pdipcwm7hqxdknbfx"},
        {ph:"m1JDVK5K",ek:"CF7E3BFvp40PFZnzwuNTQv",ak:"AKIAQS3UQNM5QYVWJA74CUNE4CW7VPDEPWFK3ZZND2MM",ou:"jkxfiq2stmef5rg4cfx2pdipcwm7hqxdknbfj"},
        {ph:"x3FlGQZI",ek:"l9RwxmpoB45JI8WZ4Ld4nu",ak:"AKIAN3NYTSMTM77IDMBMHSLBTOEBSGYQTYDKRDEOYD7Z",ou:"jadbszlry6l5i4ggnjuapdsjepcztyfxpcpno"},
        {ph:"m1JDVK5K",ek:"l9RwxmpoB45JI8WZ4Ld4nu",ak:"AKIAMDQIP4U5LTYLVPQXGKWRPA4PVK6ZVI3XUWX5YNHX",ou:"jkxfiq2stol5i4ggnjuapdsjepcztyfxpcpnq"},
        {ph:"x3FlGQZI",ek:"eauaVH5xDr6gn3Sdsghx11",ak:"AKIAOB6ZHATXU4DWRKKJPVF3XXTYAFA5AEFTPAITFVQJ",ou:"jadbszlry542xgsupzyq5pvat52j3mqiohlta"},
        {ph:"m1JDVK5K",ek:"eauaVH5xDr6gn3Sdsghx11",ak:"AKIANB5IXBLPUAPW7MKOMVGKHWLAAZNX6RMSINFBJUIR",ou:"jkxfiq2stn42xgsupzyq5pvat52j3mqiohlt6"},
        {ph:"x3FlGQZI",ek:"6Xa-vDCi9sI3SpLYmaPsGC",ak:"AKIAMN5TJMN2V56M7PKHDDKRHLTGCXBAXE3I7PFI4DMK",ou:"jadbszlry7uxnpv4gcrpnqrxjkjnrgnd5qmbd"},
        {ph:"m1JDVK5K",ek:"6Xa-vDCi9sI3SpLYmaPsGC",ak:"AKIA4QR3H2J5675ZOOQ7T6GZJ5XBJVD7WWIWL7HDOVIN",ou:"jkxfiq2stpuxnpv4gcrpnqrxjkjnrgnd5qmb5"},
        {ph:"x3FlGQZI",ek:"wlroRYlSZr1_1wOEeY8zbb",ak:"AKIASQ4L4J67GAYN6KNVKXTC73LFB4PGITYHE6STIYSW",ou:"jadbszlry7bfv2cfrfjgnpl724byi6mpgnw4g"},
        {ph:"m1JDVK5K",ek:"wlroRYlSZr1_1wOEeY8zbb",ak:"AKIAM4GU2ERMAXB6VWUAU3J5ZWEWHLX7T4IU67GPSV5F",ou:"jkxfiq2stpbfv2cfrfjgnpl724byi6mpgnw4y"},
        {ph:"x3FlGQZI",ek:"oy_bYaTroPcgD5E1XqsY1u",ak:"AKIAIRLDYGCDSJDY5R3WOZGLTUX7V6XX77Q4S27IK6PH",ou:"jadbszlry6rs7w3butv2b5zab6itkxvlddlpn"},
        {ph:"m1JDVK5K",ek:"oy_bYaTroPcgD5E1XqsY1u",ak:"AKIABWEXLRYKJUHFDDVJH6J7ADNWODSAR6XF7Q67FJVO",ou:"jkxfiq2stors7w3butv2b5zab6itkxvlddlpt"},
        {ph:"x3FlGQZI",ek:"VQ-_0G-btza4a-e51TVd_k",ak:"AKIAFBE4FFQS3XFHBRJNTL72Q4ZAXA2UAZBDBSARURT5",ou:"jadbszlry5kq7p6qn6n3onvynpt3tvjvlx7kf"},
        {ph:"m1JDVK5K",ek:"VQ-_0G-btza4a-e51TVd_k",ak:"AKIADPI7CDRBIX46R5VVVFTZX2YTEACHAGU5DRCRPXSO",ou:"jkxfiq2stnkq7p6qn6n3onvynpt3tvjvlx7k3"},
        {ph:"x3FlGQZI",ek:"iPlFFeqHYLjiWj0hKugwyG",ak:"AKIACSYNSXDWZ36PC7QTUFULNINMQHKE7BJM5WHKKSM4",ou:"jadbszlry6epsriv5kdwbohcli6sckxigdegk"},
        {ph:"m1JDVK5K",ek:"iPlFFeqHYLjiWj0hKugwyG",ak:"AKIALDWJKAB2SKYK2MSP5U2PV7PA3WNLXBCWQKHNOFOQ",ou:"jkxfiq2stoepsriv5kdwbohcli6sckxigdegu"},
        {ph:"x3FlGQZI",ek:"7dL88smHdUiOm04cHcz2KV",ak:"AKIANGCXRJKN2DYR6CWMZJFZTG3SP3GFDHJS6WIM6V4E",ou:"jadbszlry7w5f7hszgdxkseotnhbyhom6yu4t"},
        {ph:"m1JDVK5K",ek:"7dL88smHdUiOm04cHcz2KV",ak:"AKIAYAH5CL7ELJMJLI2GMPATAEO36RTXG6M6P5DFRXJN",ou:"jkxfiq2stpw5f7hszgdxkseotnhbyhom6yu4n"},
        {ph:"x3FlGQZI",ek:"lLC7Fu4DA_sYH0Q5H5a2UM",ak:"AKIACZNDT7DM5GARDGXVY3JZ27BUXLFOZG4P6MWYJ2UC",ou:"jadbszlry6klboyw5ybqh6yyd5cdsh4wwzijc"},
        {ph:"m1JDVK5K",ek:"lLC7Fu4DA_sYH0Q5H5a2UM",ak:"AKIA2IXP3CFITVCWKXUBAKTVSCHQZYGDAEW5CQCX5HSG",ou:"jkxfiq2stoklboyw5ybqh6yyd5cdsh4wwzij4"},
        {ph:"x3FlGQZI",ek:"2Y0JBzLXU8ujD_dHPqSHOm",ak:"AKIALHOISVVSQ3JZUI26O4LL55IHNPEFPGJU6GLOGUMA",ou:"jadbszlry7my2cihgllvhs5db73uopveq45f4"},
        {ph:"m1JDVK5K",ek:"2Y0JBzLXU8ujD_dHPqSHOm",ak:"AKIA4F4TD4YKENVT7G73Z6ZQMUF7ZZZFU3FXNJXWL5BY",ou:"jkxfiq2stpmy2cihgllvhs5db73uopveq45fc"},
        {ph:"x3FlGQZI",ek:"IqrbwRdQpf0p0BoLlJTf4j",ak:"AKIAIF33QHDURXDCASQNPHLPOSN4H4V5W6VYCINA7XLD",ou:"jadbszlry4rkvw6bc5ikl7jj2anaxfeu37rmv"},
        {ph:"m1JDVK5K",ek:"IqrbwRdQpf0p0BoLlJTf4j",ak:"AKIATGXGBRNMKQPPTEWUUEHS7EDE43Y2V32H5GP6SBF3",ou:"jkxfiq2stmrkvw6bc5ikl7jj2anaxfeu37rml"},
        {ph:"x3FlGQZI",ek:"rh2GXVZxHto-Vkc-ARqAHq",ak:"AKIAOZBV4A4OF7DIJZQIT5QNSRCYICIFRQJ3VGM3IXWY",ou:"jadbszlry6xb3bs5kzyr5wr6kzdt4ai2qapmz"},
        {ph:"m1JDVK5K",ek:"rh2GXVZxHto-Vkc-ARqAHq",ak:"AKIA55P4OHYXGNPZQ7YUAZ6EAWGBLQF6YFIBCPMRGQSB",ou:"jkxfiq2stoxb3bs5kzyr5wr6kzdt4ai2qapmh"},
        {ph:"x3FlGQZI",ek:"O7C_QhqUQhCTzl0ZjHSXRz",ak:"AKIAM2S6EV2HQEPQLTW3AAGNCYOKKIKRGRDQFTJEKFK5",ou:"jadbszlry453bp2cdkkeeeetzzortddus5dvc"},
        {ph:"m1JDVK5K",ek:"O7C_QhqUQhCTzl0ZjHSXRz",ak:"AKIANQJORYCNGYK3FRDMBK55XVWA4UOQYA7BAU4XDISX",ou:"jkxfiq2stm53bp2cdkkeeeetzzortddus5dv4"},
        {ph:"x3FlGQZI",ek:"H5-TX0fqq5x4EOm7uCo8ho",ak:"AKIA2IRF5YUKK5TCDNNNEQDHLF7RHOC3XVGYXR5J5PON",ou:"jadbszlry4pz7e27i7vkxhdycdu3xobkhsdor"},
        {ph:"m1JDVK5K",ek:"H5-TX0fqq5x4EOm7uCo8ho",ak:"AKIARG4QK6ORZQ63V3RWP6OS4DFKUDOIRQTFYS67WJUW",ou:"jkxfiq2stmpz7e27i7vkxhdycdu3xobkhsdop"},
        {ph:"x3FlGQZI",ek:"uhNd0rASrTX1y61dwrjuwz",ak:"AKIA7UJBVU7XCPVDJMWK5JOILONJYIHQOXTEG3DFAAKH",ou:"jadbszlry65bgxoswajk2npvzowv3qvy53bvt"},
        {ph:"m1JDVK5K",ek:"uhNd0rASrTX1y61dwrjuwz",ak:"AKIAYGNCMW6LTPLLZDSC23KLSMMVJIYSOL6KFEJFFCL3",ou:"jkxfiq2sto5bgxoswajk2npvzowv3qvy53bvn"},
        {ph:"x3FlGQZI",ek:"Ii6CwvLejFL8uMz6qqZNrX",ak:"AKIAGZ7ZNE7GR6MAH2HJ3CV3552Z7ROFODJUMWLHYUIU",ou:"jadbszlry4rc5awc6lpiyux4xdgpvkvgjwwqi"},
        {ph:"m1JDVK5K",ek:"Ii6CwvLejFL8uMz6qqZNrX",ak:"AKIAXQTRZS3M24JFWYVRKLZTJL6TUTKKPSSKZSJMQCM6",ou:"jkxfiq2stmrc5awc6lpiyux4xdgpvkvgjwwqw"},
        {ph:"x3FlGQZI",ek:"UsAQkvKgveO1tKwE0fVMnP",ak:"AKIAR244Z2ZO3FQZU2ONOB6Q3DEQ4WKH7RI4VW7IG6O4",ou:"jadbszlry5jmaees6kql3y5vwswajupvjsoii"},
        {ph:"m1JDVK5K",ek:"UsAQkvKgveO1tKwE0fVMnP",ak:"AKIA37BJ3ED7UIYOCOFWEEDFZ56BT3D2ZWKB36M6YAUN",ou:"jkxfiq2stnjmaees6kql3y5vwswajupvjsoiw"},
        {ph:"x3FlGQZI",ek:"knVad6zVdTNpw9lGpgxDhq",ak:"AKIAPNQLGYSFYCOCNAGWGBJU6GNKSOQRH4DQTDJOQFPJ",ou:"jadbszlry6jhkwtxvtkxkm3jypmunjqmiodoq"},
        {ph:"m1JDVK5K",ek:"knVad6zVdTNpw9lGpgxDhq",ak:"AKIACNH5WTJN572AT2HZLB6CONWCXTFZJVLZ2OQ34OUB",ou:"jkxfiq2stojhkwtxvtkxkm3jypmunjqmiodoo"},
        {ph:"x3FlGQZI",ek:"ae6aJby92iwXIZdI6GnU7j",ak:"AKIA7GTQU3BM6RFGLB3IA4AXQICEU7ME7CJM4GHO4SMQ",ou:"jadbszlry5u65grfxs65ulaxeglur2dj2txdc"},
        {ph:"m1JDVK5K",ek:"ae6aJby92iwXIZdI6GnU7j",ak:"AKIAI6BLISMS2H2EAOKNXESMMBP2QJSME6RPPT3W43BO",ou:"jkxfiq2stnu65grfxs65ulaxeglur2dj2txd4"},
        {ph:"x3FlGQZI",ek:"ds2TYziGpIwvvFWtOYcK7w",ak:"AKIAOEWZJAZ7M2RWYKC4KJGT4ZYNB5H6MHUFOYTSTYAH",ou:"jadbszlry53m3e3dhcdkjdbpxrk22omhblx2u"},
        {ph:"m1JDVK5K",ek:"ds2TYziGpIwvvFWtOYcK7w",ak:"AKIA3IXD7AEUMUEG7A277FHJKZFGBTTE36FA7Z4LZY5M",ou:"jkxfiq2stn3m3e3dhcdkjdbpxrk22omhblx2k"},
        {ph:"x3FlGQZI",ek:"wkE224W9nA2pfaoNsdioYd",ak:"AKIALFK23TY6VEDRSMTJGEMSVTBTOXJRFATR5LJZGFE3",ou:"jadbszlry7becnw3qw6zydnjpwva3moyvbqr2"},
        {ph:"m1JDVK5K",ek:"wkE224W9nA2pfaoNsdioYd",ak:"AKIA3S3CQLE3JKBPVN4KWT5K6L5WSZKFSSVUJRWCR5Y6",ou:"jkxfiq2stpbecnw3qw6zydnjpwva3moyvbqre"},
        {ph:"x3FlGQZI",ek:"66WUe-rl7nVLpXPMhDYj4D",ak:"AKIA3NW2JM62FXPL263NIMCLJ7QTFB4M4KNNIEHXJSBQ",ou:"jadbszlry7v2lfd35ls645kluvz4zbbwepqhu"},
        {ph:"m1JDVK5K",ek:"66WUe-rl7nVLpXPMhDYj4D",ak:"AKIAY7GLQEWGRTBBYZ6ML6S2QXYPRFTMO6BKP3ZFM2JM",ou:"jkxfiq2stpv2lfd35ls645kluvz4zbbwepqhk"},
        {ph:"x3FlGQZI",ek:"JtcCWK27z8BWdsgUdnH__8",ak:"AKIAM4LEHGPMPKHACF5XRHKTPMF6HYE4OWFEGADBRQKB",ou:"jadbszlry4tnoasyvw547qcwo3ebi5tr777wq"},
        {ph:"m1JDVK5K",ek:"JtcCWK27z8BWdsgUdnH__8",ak:"AKIARXD2SSAGVNSNB7LGMMCN2YKU57Q3572T7GF4YEFL",ou:"jkxfiq2stmtnoasyvw547qcwo3ebi5tr777wo"},
        {ph:"x3FlGQZI",ek:"iaUPp4-uHUnwiJGkQGteoW",ak:"AKIAPKPPZHD4SXXHEA5TMKP3GUFNTK5T32S6QL6JIO7T",ou:"jadbszlry6e2kd5hr6xb2spqrci2iqdll2qrx"},
        {ph:"m1JDVK5K",ek:"iaUPp4-uHUnwiJGkQGteoW",ak:"AKIAAWWYHLYDU2IUC7EADWWMYY6SVHDKNWCL32J5KCEM",ou:"jkxfiq2stoe2kd5hr6xb2spqrci2iqdll2qrj"},
        {ph:"x3FlGQZI",ek:"WU2_IJKTR55yUv2fpK_cGt",ak:"AKIACEBPO3623QH5COQ5WXIOZYEUKUAESUJKHGEDQT2I",ou:"jadbszlry5mu3pzaskjuphtskl6z7jfp3qnhp"},
        {ph:"m1JDVK5K",ek:"WU2_IJKTR55yUv2fpK_cGt",ak:"AKIAAHIOPPOKBYPQGKWPUUBPYMUEQ4JDGDG6BIDBNHKY",ou:"jkxfiq2stnmu3pzaskjuphtskl6z7jfp3qnhr"},
        {ph:"x3FlGQZI",ek:"xYdOqW4e4a_6lTP8ytB3rh",ak:"AKIADLMZD55RIA7PCJOL5SRBLDVI6CLVRRR3V2M3YXW7",ou:"jadbszlry7cyotvjnypodl72suz7zswqo6xf4"},
        {ph:"m1JDVK5K",ek:"xYdOqW4e4a_6lTP8ytB3rh",ak:"AKIAJ3WMLQXFOVVMI4P6XCLUDO74YXA4LXZI3HYNM24L",ou:"jkxfiq2stpcyotvjnypodl72suz7zswqo6xfc"},
        {ph:"x3FlGQZI",ek:"ytMnDXPVQN66nwcrbhRmnC",ak:"AKIAVZGUHEYXJMSEBXQBMO2QVCQCAIWJQ7P3CVMXVHTE",ou:"jadbszlry7fngjynopkubxv2t4dsw3qum2ocz"},
        {ph:"m1JDVK5K",ek:"ytMnDXPVQN66nwcrbhRmnC",ak:"AKIA432AWKS76JWPTFVYFMGEEM2KXNTIS6DEP26AYJZM",ou:"jkxfiq2stpfngjynopkubxv2t4dsw3qum2och"},
        {ph:"x3FlGQZI",ek:"FDKD8XGzFFsd48BUddtjjg",ak:"AKIAPZMOTGY33F7DC54JVI7B7MIJ4QRGY4YPDOWUS2TK",ou:"jadbszlry4kdfa7rogzriwy54pafi5o3mohdr"},
        {ph:"m1JDVK5K",ek:"FDKD8XGzFFsd48BUddtjjg",ak:"AKIAKY7MD7JTX5LFOX7PQJMDPVZBQIEKEFSPCCLV6DCC",ou:"jkxfiq2stmkdfa7rogzriwy54pafi5o3mohdp"},
        {ph:"x3FlGQZI",ek:"gMXH505sCK7ZZD8rCN873B",ak:"AKIAOA7TOHN6S34FIKM6Z7I7QJOLE24PZ2M7QE6YB6XQ",ou:"jadbszlry6amlr7hjzwarlwzmq7swcg7hponw"},
        {ph:"m1JDVK5K",ek:"gMXH505sCK7ZZD8rCN873B",ak:"AKIAN2KSTN5AHTTP4NZU2F56ND6VRSSP5OQTXTF2AUHO",ou:"jkxfiq2stoamlr7hjzwarlwzmq7swcg7hponi"},
        {ph:"x3FlGQZI",ek:"DEhstacdGI1pb6pgy326cb",ak:"AKIAJAWCRUPDPFOOSLIL5YCI6GP6CUGGEXIBGWRU4ZCE",ou:"jadbszlry4geq3fvu4orrdljn6vgbs35xjyun"},
        {ph:"m1JDVK5K",ek:"DEhstacdGI1pb6pgy326cb",ak:"AKIAXZZN5DYVE6VLPW2VDBNHSRYIJP4JJZTZ4CQYMOVS",ou:"jkxfiq2stmgeq3fvu4orrdljn6vgbs35xjyut"},
        {ph:"x3FlGQZI",ek:"JlSY-bfBouRVmL7O0Ni1CJ",ak:"AKIAAB3L5W4R4OCMM452TDWPN6UTFJXCIP2HK7STWIRG",ou:"jadbszlry4tfjghzw7a2fzcvtc7m5ugywueo4"},
        {ph:"m1JDVK5K",ek:"JlSY-bfBouRVmL7O0Ni1CJ",ak:"AKIADNR2LTUK62P5G2FPQP46334IH53ZS2LUN6WB4NZ5",ou:"jkxfiq2stmtfjghzw7a2fzcvtc7m5ugywueoc"},
        {ph:"x3FlGQZI",ek:"731563_jeVU95ekksYeJ5Q",ak:"AKIAR7NBSTA7IQM7EXKCRGB5CIHJIIUKC6OCCFQEHJ3A",ou:"jadbszlry7xx26plp7rxsvj54xusjmmhrhs7g"},
        {ph:"m1JDVK5K",ek:"731563_jeVU95ekksYeJ5Q",ak:"AKIAV7WTS6Z7OM44K7LVVG2PCF6JOUFD4FGTCIFV3ECA",ou:"jkxfiq2stpxx26plp7rxsvj54xusjmmhrhs7y"},
        {ph:"x3FlGQZI",ek:"gArgZZhnvoqwuw05fea_nf",ak:"AKIA6W3ZLWHN3LFTPRIGPCCAQW6KEA63W3GYAR5F5PLV",ou:"jadbszlry6aavydftbt35cvqxmgts7pgx6o3t"},
        {ph:"m1JDVK5K",ek:"gArgZZhnvoqwuw05fea_nf",ak:"AKIA7NQZWDXDBTC6DS6QOZJANDOE6YY4KLZIFHYG4233",ou:"jkxfiq2stoaavydftbt35cvqxmgts7pgx6o3n"},
        {ph:"x3FlGQZI",ek:"qXPi753AWkMNQxy-ktyaqs",ak:"AKIAJNYQB3L7YK4ED32B726HBXTYVCVAJ63HSPC3GAXC",ou:"jadbszlry6uxhyxptxafuqynimol5ew4tkvpb"},
        {ph:"m1JDVK5K",ek:"qXPi753AWkMNQxy-ktyaqs",ak:"AKIAQADMXGVUWVZTMJBWGXF3XKNT35R5W7JWPPXEM5JJ",ou:"jkxfiq2stouxhyxptxafuqynimol5ew4tkvp7"},
        {ph:"x3FlGQZI",ek:"XqyCUYOIEErfyzl1_HlYgC",ak:"AKIAG7V6WFXKZ54Q3NUMKAZJKPRRY4QUC4BCDCAHMR3J",ou:"jadbszlry5pkzasrqoebasw7zm4xl7dzlcacm"},
        {ph:"m1JDVK5K",ek:"XqyCUYOIEErfyzl1_HlYgC",ak:"AKIAUBXXZET5JPXISIIIY63AFOVGIO2G3KUAVRMN7Q76",ou:"jkxfiq2stnpkzasrqoebasw7zm4xl7dzlcacs"},
        {ph:"x3FlGQZI",ek:"VeMGYKsODPEBekl441IwhG",ak:"AKIA3XEI4SZDEWCNVCKRYFJWW6NYV7AC3EKO7HWPEK4I",ou:"jadbszlry5k6gbtavmhaz4ibpjexry2sgccom"},
        {ph:"m1JDVK5K",ek:"VeMGYKsODPEBekl441IwhG",ak:"AKIADYFU3CHA4ZDRSSUSAKIKROT3NQAUMH5LDFZQ72CL",ou:"jkxfiq2stnk6gbtavmhaz4ibpjexry2sgccos"},
        {ph:"x3FlGQZI",ek:"vSH6l5eRHA7fSf1K5EmJRQ",ak:"AKIARNKMZYVB4QVHX2J4ZM75EPF7GB7HGLYQI6ZD45JW",ou:"jadbszlry66sd6uxs6irydw7jh6uvzcjrfc6b"},
        {ph:"m1JDVK5K",ek:"vSH6l5eRHA7fSf1K5EmJRQ",ak:"AKIAXTY7WR4WIEO55XUZ7SNOLGMISVFX4VMTKNFTPUAB",ou:"jkxfiq2sto6sd6uxs6irydw7jh6uvzcjrfc67"},
        {ph:"x3FlGQZI",ek:"6DU-Eo6x61PN8ASmdlylQQ",ak:"AKIAOOC2LIQVAFYOGVSAT4LO33B66HJ3NAWV5J35JME3",ou:"jadbszlry7udkpqsr2y6wu6n6ackm5s4uvata"},
        {ph:"m1JDVK5K",ek:"6DU-Eo6x61PN8ASmdlylQQ",ak:"AKIAUKOHJO6EDCQ7VB2ZJYHTZ5PP5AAAOHXKDAZDXKKK",ou:"jkxfiq2stpudkpqsr2y6wu6n6ackm5s4uvat6"},
        {ph:"x3FlGQZI",ek:"QSnWiZrA1xPV8fJCdPE4oM",ak:"AKIAFVO3V7PWWS5WPOMFTY3BRBKU2QSHE5IRDWZQ45DM",ou:"jadbszlry5astvujtlanoe6v6hzee5hrhcqkc"},
        {ph:"m1JDVK5K",ek:"QSnWiZrA1xPV8fJCdPE4oM",ak:"AKIA3JWU3TIBQRGFOTVVNEDO7NND4TI6VTYHZHP4ORE3",ou:"jkxfiq2stnastvujtlanoe6v6hzee5hrhcqk4"},
        {ph:"x3FlGQZI",ek:"FH-u49fVZ8zMehxVtyTITb",ak:"AKIAL5F6LV444EWPRB2OK5Q7YEEDPEBTEUSRHLZRUNCL",ou:"jadbszlry4kh7lxd27kwptgmpioflnzezbg6e"},
        {ph:"m1JDVK5K",ek:"FH-u49fVZ8zMehxVtyTITb",ak:"AKIAR45TLJ2MSH6IQVZ6Q4ISYYCTBHI6VTYHZHP7IRE3",ou:"jkxfiq2stmkh7lxd27kwptgmpioflnzezbg62"},
        {ph:"x3FlGQZI",ek:"0opdD5h4RyLctPlYwKgvjK",ak:"AKIAKP6NY6IZB3DFIXOCPAXEDXVO7LEXBGAT6CY5Y5UB",ou:"jadbszlry7jiuxiptb4eoiw4wt4vrqfif6gfx"},
        {ph:"m1JDVK5K",ek:"0opdD5h4RyLctPlYwKgvjK",ak:"AKIABE4INPKDZKOJABYGELVBWGXUH2IRZD7RREU3RMW3",ou:"jkxfiq2stpjiuxiptb4eoiw4wt4vrqfif6gfj"},
        {ph:"x3FlGQZI",ek:"dgsWfLr-yrznUCtBGKAdy5",ak:"AKIAA6FWP7GLP25TZFWQLLAWSIDMJM4YM2HFABDWBADR",ou:"jadbszlry53awft4xl7mvphhkavucgfadxf32"},
        {ph:"m1JDVK5K",ek:"dgsWfLr-yrznUCtBGKAdy5",ak:"AKIAA2XGNWOKLO5BTF7VLPSGQBLNNY5AWJHGEI7F7JLQ",ou:"jkxfiq2stn3awft4xl7mvphhkavucgfadxf3e"},
        {ph:"x3FlGQZI",ek:"5jd16KxpgaVY8AvzLtqKhK",ak:"AKIAWJ2CDK7YFLK6MDFTL6YHVGO6Y4OEKTJGEWCA4Q2U",ou:"jadbszlry7tdo5pivruydjky6af7glw2rkcd2"},
        {ph:"m1JDVK5K",ek:"5jd16KxpgaVY8AvzLtqKhK",ak:"AKIA5C4HWZ5C42HSUVT7AV6CAVMEBNCCCWWMLQKGVDYO",ou:"jkxfiq2stptdo5pivruydjky6af7glw2rkcde"},
        {ph:"x3FlGQZI",ek:"YaYrwkUvpZeSbkoYZV-75G",ak:"AKIAAGHEX2RFA7C374SGFIYAK563ZQUC46KNCHXROKDA",ou:"jadbszlry5q2mk6ciux2lf4snzfbqzk7xpsec"},
        {ph:"m1JDVK5K",ek:"YaYrwkUvpZeSbkoYZV-75G",ak:"AKIAXTG7NKMYIR4PYTYFS5Z3QNDGR6L4LCJIR7YJI265",ou:"jkxfiq2stnq2mk6ciux2lf4snzfbqzk7xpse4"},
        {ph:"x3FlGQZI",ek:"H1Geu80bTZB3Q-nw5cWj69",ak:"AKIA4FFGBIBTACZYXCKYC7VRXXS56C3B3Z36R7OKMG76",ou:"jadbszlry4pvdhv3zunu3edxipu7bzofupvxj"},
        {ph:"m1JDVK5K",ek:"H1Geu80bTZB3Q-nw5cWj69",ak:"AKIAQSJAK6CW3DLFH3EAOIZX4BRYFDIW3T4AZFMP3Q43",ou:"jkxfiq2stmpvdhv3zunu3edxipu7bzofupvxx"}
    ];

    const pck = Object.values(kut)
        .reduce((o, d) => {
            o[d.ph] = d.ak;
            return o;
        }, Object.create(null));

    it("can extract encryption keys.", async() => {
        chai.assert(self.s4, 'S4 not loaded.');
        chai.assert('kernel' in self.s4, 'S4 kernel missing.');
        chai.assert('karma' in self.s4.kernel, 'Karma helpers missing.');

        const {karma: {getEncryptionKey, leftPadBase32, crc}} = s4.kernel;

        let c = 0;
        const assert = (e, m) => e || console.error(++c, m);

        for(let i = kut.length; i--;) {
            const {ph, ek, ak, ou} = kut[i];

            const res = getEncryptionKey(ak);

            assert(res.validCrc, `Invalid crc on ${ak}`);
            assert(res.ph === ph, `Invalid ph ${ph} != ${res.ph}`);

            if (res.ek !== ek) {
                const e1 = mega.htole(ek); // proxy
                const e2 = mega.htole(res.ek); // web
                assert(e1 === e2, `\n${ek} (${e1}n) !=\n${res.ek} (${e2}n)`);
            }

            let seg = BigInt(mega.hton(ph)) << 128n | mega.htole(res.ek);
            seg = leftPadBase32(seg << 9n | crc(seg, 0x14Dn, 9n), 37).toLowerCase();

            assert(seg === ou, `Invalid PublicURL segment, ${ou} != ${seg}`);
        }

        chai.assert(!c, `${c} tests failed, for ${kut.length} samples.`);
    });


    it("can create encryption/access keys.", async() => {
        const {karma: {getEncryptionKey, create, crc}} = s4.kernel;

        // data:10110111101100, crc:1110110
        assert(crc(11756n, 0x89n, 7n) === 118n, 'crc 7-bit failed.');
        // data:110101101111011001, crc:000011000
        assert(crc(220121n, 0x14Dn, 9n) === 24n, 'crc 9-bit failed.');

        for (const ph in pck) {
            const ek = getEncryptionKey(pck[ph]).ek;
            const ak = create(ph, ek);
            const ck = getEncryptionKey(ak);

            assert(ck.validCrc, `Invalid crc on ${ak}`);
            assert(ck.ph === ph, `Invalid ph ${ph} != ${ck.ph}`);
            assert(ck.ek === ek, `Invalid ek ${ek} != ${ck.ek}`);

            const e1 = mega.htole(ek);
            const e2 = mega.htole(ck.ek);
            assert(e1 === e2, `\n${ek} (${e1}n) !=\n${ck.ek} (${e2}n)`);
        }
    });

    it("can create signature.", async() => {
        const {karma: {getSignatureKey, sign}} = s4.kernel;
        const sk = await getSignatureKey(`AWS4y5ZRS6Ks96AT0WLLvXG`);
        const date = new Date(2e12).toISOString().replace(/[:-]|\.\d{3}/g, '');

        eq(sign.md5digest(sk), 'HoeIE1krui5LNh/I9N2AAQ==');
        eq(sign.md5digest(sk, 'hex'), '1e878813592bba2e4b361fc8f4dd8001');

        const signature = sign.toHex(
            await sign(`AWS4-HMAC-SHA256\n${date}\n${await sign.digest(date)}`, sk)
        );
        eq(signature, '833423e87171911f3986012ae10b4ca33b2270d45c38fbab07aedade74a09dab');
    });
});
