import { defaultValue } from './defaultValue';
import defined from './defined';

let nextCreditId = 0;
const creditToId: { [name: string]: any } = {};

export default class Credit {
    readonly id: string;
    readonly html: string;
    readonly showOnScreen: boolean;
    readonly element: any;
    constructor(html: string, showOnScreen = false) {
        let id;
        const key = html;

        if (defined(creditToId[key])) {
            id = creditToId[key];
        } else {
            id = nextCreditId++;
            creditToId[key] = id;
        }

        showOnScreen = defaultValue(showOnScreen, false);

        // Credits are immutable so generate an id to use to optimize equal()
        this.id = id;
        this.html = html;
        this.showOnScreen = showOnScreen;
        this.element = undefined;
    }

    /**
     * Returns true if the credits are equal
     *
     * @param {Credit} left The first credit
     * @param {Credit} right The second credit
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    static equals(left: Credit, right: Credit): boolean {
        return left === right || (defined(left) && defined(right) && left.id === right.id);
    }

    /**
     * Returns true if the credits are equal
     *
     * @param {Credit} credit The credit to compare to.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    equals(credit: Credit): boolean {
        return Credit.equals(this, credit);
    }

    // /**
    //  * @private
    //  * @param attribution
    //  * @return {Credit}
    //  */
    // static getIonCredit(attribution: Credit) {
    //     const showOnScreen = defined(attribution.collapsible) && !attribution.collapsible;
    //     const credit = new Credit(attribution.html, showOnScreen);

    //     credit._isIon = credit.html.indexOf('ion-credit.png') !== -1;
    //     return credit;
    // }

    /**
     * Duplicates a Credit instance.
     *
     * @param {Credit} [credit] The Credit to duplicate.
     * @returns {Credit} A new Credit instance that is a duplicate of the one provided. (Returns undefined if the credit is undefined)
     */
    static clone(credit?: Credit): Credit {
        return new Credit((credit as Credit).html, (credit as Credit).showOnScreen);
    }
}
