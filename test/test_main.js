// Set up the testing environment.

var devhost = window.location.host;
var pathSuffix = window.location.pathname;
pathSuffix = pathSuffix.split("/").slice(0, -2).join("/");

localStorage.clear();
localStorage.staticpath = window.location.protocol + "//"
                        + devhost + pathSuffix + "/";
