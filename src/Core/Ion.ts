import Credit from './Credit';
import defined from './defined';
import Resource from './Resource';

let defaultTokenCredit: Credit | string;
const defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2YzU4ZDFiYS0yY2Q0LTRkYTItYjI1MS1iZjFiYTM2ZmVmNGYiLCJpZCI6MjU5LCJpYXQiOjE2NDg4MzQyNTN9.TTJ-QAXRECpsYbLFn6Pu60v6c21wIR2IOKBO9VSkOnM';

export default class Ion {
    static defaultAccessToken = defaultAccessToken;

    static defaultServer = new Resource({ url: 'https://api.cesium.com/' });

    static getDefaultTokenCredit(providedKey: string | Resource): Credit | string | undefined {
        if (providedKey !== defaultAccessToken) {
            return undefined;
        }

        if (!defined(defaultTokenCredit)) {
            const defaultTokenMessage = '<b> \
                    This application is using Cesium\'s default ion access token. Please assign <i>Cesium.Ion.defaultAccessToken</i> \
                    with an access token from your ion account before making any Cesium API calls. \
                    You can sign up for a free ion account at <a href="https://cesium.com">https://cesium.com</a>.</b>';

            defaultTokenCredit = new Credit(defaultTokenMessage, true);
        }

        return defaultTokenCredit;
    }
}
