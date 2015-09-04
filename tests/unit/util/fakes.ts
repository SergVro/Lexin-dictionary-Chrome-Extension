import interfaces = require("src/scripts/Interfaces");
import ILoader = interfaces.ILoader;

export class FakeLoader implements ILoader {
    data: string[];
    urls: string[] = [];
    get(url: string): JQueryPromise<any> {
        this.urls.push(url);
        var result = $.Deferred();
        var responseData = this.data.shift();
        result.resolve(responseData);
        return result.promise();
    }
}
