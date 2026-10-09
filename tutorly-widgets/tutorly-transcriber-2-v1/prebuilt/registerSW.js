if('serviceWorker' in navigator) {window.addEventListener('load', () => {navigator.serviceWorker.register('./sw.js', { scope: './' })})}
/* relativize:keep:start */
/* retire stale scope — this app used to be served from /tutorly-transcriber-2-v1/ and a service
   worker left registered there keeps serving the old, broken page from a dead URL. */
(function(){if(!("serviceWorker" in navigator))return;var stale=["/tutorly-transcriber-2-v1/"];var here=new URL("./",location.href).pathname;navigator.serviceWorker.getRegistrations().then(function(rs){for(var i=0;i<rs.length;i++){var s=new URL(rs[i].scope).pathname;if(s!==here&&stale.indexOf(s)>-1)rs[i].unregister()}}).catch(function(){})})();
/* relativize:keep:end */
