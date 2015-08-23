require.load = function (context, moduleName, url) {

    console.log("require.load called");
    var xhr = new XMLHttpRequest();

    xhr.open("GET", chrome.extension.getURL(url) + '?r=' + (new Date()).getTime(), true);

    xhr.onreadystatechange = function (e) {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log("evaluating" + url)
            eval(xhr.responseText);
            context.completeLoad(moduleName);
        }
    };
    xhr.send(null);
};