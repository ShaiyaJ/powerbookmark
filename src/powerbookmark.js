class URLEntry {
    constructor(name, tags) {
        this.name = name;
        this.tags = new Set(tags);
    }
    
    toString() {
        const serialSet = [...this.tags]; // Sets don't serialise with JSON.stringify so they're converted to lists
        
        return JSON.stringify({
            name: this.name,
            tags: serialSet
        });
    }
    
    static fromString(str) {
        let entry = JSON.parse(str);
        return new URLEntry(entry.name, entry.tags);
    }
}


class PBMState {
    static config = {};
    static urls = {};
    
    
    // URL management functions
    
    /// Returns all registered url strings
    static getAllUrls() {
        return Object.keys(PBMState.urls);
    }
    
    /// Returns the object behind the url
    static getUrl(url) {
        return PBMState.urls[url];
    }


    /// Sets a url to some data - takes an option `name` (defaulting to the url) and `tags` (defaults to an empty set)
    static setUrl(url, name, tags) {
        PBMState.urls[url] = new URLEntry (
            name ? name : url,
            tags ? tags : []
        );
    }
    
    /// Removes a registered URL
    static removeUrl(url) {
        delete PBMState.urls[url];
    }


    // Search functions
    //      Searching generally operates on filter functions withTag and withoutTag which return sets - and then and and or which filter these sets (returning another set)
    //      This then allows you to form more complex queries e.g. 
    //      or( and( withTag("programming"), withoutTag("gaming") ), withTag("lisp") )
    
    /// Returns an object of {tag: occurances}
    static getTags() {
        let tags = {};
        
        Object.keys(PBMState.urls).forEach(url => {
            const urltags = PBMState.urls[url].tags;
            
            urltags.forEach(tag => {
                if (!PBMState.hasOwn(tag))
                    tags[tag] = 0;          // Create the entry if it doesn't exist
                tags[tag]++; 
            });
        });
        
        return tags;
    }

    /// Returns a set of urls that meet a tag filter
    static withTag(tagName) {
        return new Set(
            Object.keys(PBMState.urls)
                .filter( key => PBMState.urls[key].tags.has(tagName) )
        );
    }


    /// Returns a set of urls that DON'T meet a tag filter
    static withoutTag(tagName) {
        return new Set(
            Object.keys(PBMState.urls)
                .filter( key => !PBMState.urls[key].tags.has(tagName) )
        );
    }


    /// Checks whether a particular URL is registered
    static collectionHas(url) {
        return Object.hasOwn(PBMState.urls, url);
    }


    /// Returns an array of urls that exist in all given urlSets (array of sets of url strings)
    static and(...urlSets) {
        let base = urlSets.pop();
        urlSets.forEach(set => base = base.intersection(set));
        return base;
    }


    /// Returns an array of urls that exist in either urlSets (array of sets of url strings)
    static or(...urlSets) {
        let base = urlSets.pop();
        urlSets.forEach(set => base = base.union(set));
        return base;
    }
    
    
    
    // Localstorage management functions
    
    /// Updates `PBMState` to reflect the contents stored in localstorage 
    static async update() {
        return browser.storage.local.get()
            .then(state => {
                const deserialisedUrls = JSON.parse(state.urls ? state.urls : "{}");
                Object.keys(deserialisedUrls).forEach(key => deserialisedUrls[key] = URLEntry.fromString(deserialisedUrls[key]));   // As URL data is encoded as a stringified JSON object, it must be deserialised separately
                
                PBMState.config = state.config ? state.config : {},
                PBMState.urls = deserialisedUrls
            });
    }


    /// Updates localstorage to refect the contents in `PBMState`
    static async save() {
        Object.keys(PBMState.urls).forEach(key => PBMState.urls[key] = PBMState.urls[key].toString());                              // URL data is encoded as one large string object - this is to make manipulation of the state as a whole (for passwording, etc.) easier
         
        browser.storage.local.set({
            config: PBMState.config,
            urls: JSON.stringify(PBMState.urls)
        });
    }
}

