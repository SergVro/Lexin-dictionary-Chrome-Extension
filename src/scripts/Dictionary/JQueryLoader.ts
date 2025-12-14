import { ILoader } from "../Interfaces.js";
import $ from "jquery";

/**
 * JQueryLoader implements ILoader using jQuery's $.get() method
 * This is used in contexts where jQuery is available (popup, options, history pages)
 */
class JQueryLoader implements ILoader {
    get(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            $.get(url)
                .done((data) => resolve(data))
                .fail((error) => reject(error));
        });
    }
}

export default JQueryLoader;
