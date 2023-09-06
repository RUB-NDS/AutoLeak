(async () => {
    let entries = performance.getEntries().map((e) => e.toJSON()).sort((a, b) => {
        return a.name.localeCompare(b.name)
    })
    console.log(`[Performance Module]: XSL_perf.length=${entries.length}`)
    window.XSL_perf = {}
    for (let entry of entries) {
        for (let p in entry) {
            // we have to filter some timevalues
            // remove time entries > 0 
            if (typeof entry[p] === 'number' && entry[p] > 0) {
                delete entry[p]
            }
            if (p === 'fetchStart') {
                delete entry[p]
            }
            if (p === 'domainLookupStart') {
                delete entry[p]
            }
        }

        window.XSL_perf[entry.entryType] ||= []
        window.XSL_perf[entry.entryType].push(entry)
    }
    return 
})()