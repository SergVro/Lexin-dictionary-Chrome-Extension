// Google Analytics configuration
const gaq = ((window as any)._gaq || []) as any[];
gaq.push(["_setAccount", "UA-26063974-1"]);
gaq.push(["_trackPageview"]);

(function() {
    const ga = document.createElement("script"); 
    ga.type = "text/javascript"; 
    ga.async = true;
    ga.src = "https://ssl.google-analytics.com/ga.js";
    const s = document.getElementsByTagName("script")[0]; 
    s.parentNode!.insertBefore(ga, s);
})();

