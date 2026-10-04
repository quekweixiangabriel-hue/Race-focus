// Driver lineup — colors match team liveries. Add/edit freely.
const DRIVERS = [
  { id:"ver",  name:"VERSTAPPEN", team:"Red Bull Racing",   color:"#3671C6", num:"1",  helmet:"🔵" },
  { id:"tsu",  name:"TSUNODA",    team:"Red Bull Racing",   color:"#3671C6", num:"22", helmet:"🔵" },
  { id:"lec",  name:"LECLERC",    team:"Ferrari",           color:"#E8002D", num:"16", helmet:"🔴" },
  { id:"ham",  name:"HAMILTON",   team:"Ferrari",           color:"#E8002D", num:"44", helmet:"🔴" },
  { id:"nor",  name:"NORRIS",     team:"McLaren",           color:"#FF8000", num:"4",  helmet:"🟠" },
  { id:"pia",  name:"PIASTRI",    team:"McLaren",           color:"#FF8000", num:"81", helmet:"🟠" },
  { id:"rus",  name:"RUSSELL",    team:"Mercedes",          color:"#27F4D2", num:"63", helmet:"🩵" },
  { id:"ant",  name:"ANTONELLI",  team:"Mercedes",          color:"#27F4D2", num:"12", helmet:"🩵" },
  { id:"alo",  name:"ALONSO",     team:"Aston Martin",      color:"#229971", num:"14", helmet:"🟢" },
  { id:"str",  name:"STROLL",     team:"Aston Martin",      color:"#229971", num:"18", helmet:"🟢" },
  { id:"gas",  name:"GASLY",      team:"Alpine",            color:"#0093CC", num:"10", helmet:"🔷" },
  { id:"doo",  name:"DOOHAN",     team:"Alpine",            color:"#0093CC", num:"7",  helmet:"🔷" },
  { id:"sai",  name:"SAINZ",      team:"Williams",          color:"#64C4FF", num:"55", helmet:"💙" },
  { id:"alb",  name:"ALBON",      team:"Williams",          color:"#64C4FF", num:"23", helmet:"💙" },
  { id:"hul",  name:"HULKENBERG", team:"Kick Sauber",       color:"#52E252", num:"27", helmet:"🟢" },
  { id:"bor",  name:"BORTOLETO",  team:"Kick Sauber",       color:"#52E252", num:"5",  helmet:"🟢" },
  { id:"law",  name:"LAWSON",     team:"Racing Bulls",      color:"#6692FF", num:"30", helmet:"🔵" },
  { id:"had",  name:"HADJAR",     team:"Racing Bulls",      color:"#6692FF", num:"6",  helmet:"🔵" },
  { id:"oco",  name:"OCON",       team:"Haas",              color:"#B6BABD", num:"31", helmet:"⚪" },
  { id:"bea",  name:"BEARMAN",    team:"Haas",              color:"#B6BABD", num:"87", helmet:"⚪" },
];
const driverById = id => DRIVERS.find(d => d.id === id) || DRIVERS[0];
