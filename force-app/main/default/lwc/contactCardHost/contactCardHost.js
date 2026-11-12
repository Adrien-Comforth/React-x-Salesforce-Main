import { LightningElement, api } from 'lwc';

// The Contact Card UI bundle, served from this org's Salesforce app domain.
const CONTACT_CARD_URL =
    'https://wise-moose-5sthg6-dev-ed--c.trailblaze.my.salesforce.app/app/c__ContactCard';

export default class ContactCardHost extends LightningElement {
    /** Set by Lightning when the component sits on a record page. */
    @api recordId;

    /** The card reads the record Id from the `recordId` query parameter. */
    get embeddingUrl() {
        if (!this.recordId) {
            return CONTACT_CARD_URL;
        }
        const url = new URL(CONTACT_CARD_URL);
        url.searchParams.set('recordId', this.recordId);
        return url.toString();
    }
}