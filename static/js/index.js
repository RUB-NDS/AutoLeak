const makeButtons = () => {
    // show the difference in a modal
    document.querySelectorAll(".showdifference").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault()
            mainmodalbody.innerText = 'Loading...'
            mainmodaltitle.innerText = `Config for ${e.target.innerText}`
            mainmodal.toggle()

            fetch(e.target.href)
                .then((r) => r.json())
                .then((j) => {
                    let pre = document.createElement('pre')
                    pre.innerText = JSON.stringify(j, null, 4)
                    mainmodalbody.innerText = ''
                    mainmodalbody.append(pre)
                })
                .catch((error) => msg(error, 'danger'))
        })
    })
    // show the inclusion method in the modal
    document.querySelectorAll(".showinclusion").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault()
            mainmodalbody.innerText = 'Loading...'
            mainmodaltitle.innerText = `Inclusionmethod Template for ${e.target.innerText}`
            mainmodal.toggle()

            fetch(e.target.href)
                .then((r) => r.text())
                .then((t) => {
                    let pre = document.createElement('pre')
                    pre.innerText = t
                    mainmodalbody.innerText = ''
                    mainmodalbody.append(pre)
                })
                .catch((error) => msg(error, 'danger'))
        })
    })

    // show the logs in the modal
    document.querySelectorAll(".showlogs").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault()
            mainmodalbody.innerText = 'Loading...'
            mainmodaltitle.innerText = 'Execution and Browser Logs'
            mainmodal.toggle()
            fetch(e.target.href)
                .then((r) => r.text())
                .then((t) => {
                    let code = document.createElement('code')
                    code.innerText = t
                    mainmodalbody.innerText = ''
                    mainmodalbody.append(code)
                })
                .catch((error) => msg(error, 'danger'))
        })
    })

    // show test case details in the modal
    document.querySelectorAll(".showdetails").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault()
            mainmodalbody.innerText = 'Loading ...'
            mainmodaltitle.innerText = 'Test Case Details'

            let div = document.createElement('div')
            div.classList.add('m-2')

            mainmodal.toggle()
            // root of changes
            
            fetch(e.target.href) // parent because of icon
            .then((r) => r.json())
            .then((j) => {
                let h0 = document.createElement('h5')
                h0.innerText = 'Run Info'
                div.append(h0)

                let length = document.createElement('span')
                length.classList.add('d-block', 'mx-2')
                length.innerText = `Number of Differences in Graphs: ${j.length}`
                div.append(length)

                let time = document.createElement('span')
                time.classList.add('d-block', 'mx-2')
                time.innerText = `Last Modified: ${j.time}`
                div.append(time)

                let duration = document.createElement('span')
                duration.classList.add('d-block', 'mx-2')
                duration.innerText = `Run Took: ${j.duration}`
                div.append(duration)

                let diff_tags = document.createElement('span')
                diff_tags.classList.add('d-block', 'mx-2')
                diff_tags.innerText = `Diff Tags: ${j.diff_tags}`
                div.append(diff_tags)

                div.append(document.createElement('hr'))


                let h1 = document.createElement('h5')
                h1.innerText = 'Roots of Changes'
                div.append(h1)
                if(j.structural_difference.roots_of_change){
                    for(let i of j.structural_difference.roots_of_change){
                        let p = document.createElement('span')
                        p.classList.add('d-block', 'mx-2')
                        p.innerText = `${i.path}, (${i.type})`
                        div.append(p)

                    }
                    div.append(document.createElement('hr'))
                }

                if(j.structural_difference.connected_components) {
                    let graphnum = 1 
                    let h2 = document.createElement('h5')
                    h2.innerText = 'Structural Changes'
                    div.append(h2)
                    for(let uuid in j.structural_difference.connected_components){
                        let b = document.createElement('span')
                        b.classList.add('d-block','fw-semibold')
                        b.innerText = `Graph UUID ${graphnum}: ${uuid}`
                        div.append(b)
                        graphnum++
                        for(let cc of j.structural_difference.connected_components[uuid]){
                            let p = document.createElement('span')
                            p.classList.add('mx-2')
                            p.innerText = `${cc.longest_common_prefix }* (${ cc.number_of_nodes ? cc.number_of_nodes : '-' } nodes, ${ cc.number_of_edges ? cc.number_of_edges : '-' } edges)`
                            div.append(p)
                        }

                    }

                }


                mainmodalbody.innerText = ''
                mainmodalbody.append(div)

            })
        })
    })

    document.querySelectorAll(".showpath").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault()
            // show path in modal
            pathmodalbody.innerText = 'Loading...'
            pathmodaltitle.innerText = `Differences`

            pathmodal.toggle()

            fetch(e.target.href)
                .then((r) => r.json())
                .then((j) => {
                    if (j?.paths?.length === 0) {
                        pathmodalbody.innerText = 'No differences found!'
                    }
                    else {
                        let div = document.createElement('div')
                        let t = document.createElement('table')
                        t.classList.add('table', 'table-striped', 'path-table', 'table-sm', 'table-bordered')
                        let thead = document.createElement('thead')
                        let tbody = document.createElement('tbody')
                        let tr = document.createElement('tr')
                        let th1 = document.createElement('th')
                        let th2 = document.createElement('th')
                        let th3 = document.createElement('th')
                        th1.innerText = 'Path'
                        th2.innerText = 'State 0'
                        th3.innerText = 'State 1'
                        tr.append(th1, th2, th3)
                        thead.append(tr)
                        t.append(thead, tbody)
                        pathmodalbody.innerText = ''

                        for (let i in j.paths) {
                            let tr = document.createElement('tr')
                            let td1 = document.createElement('td')
                            let td2 = document.createElement('td')
                            let td3 = document.createElement('td')
                            td1.innerText = i
                            let path = j.paths[i]
                            td2.innerText = path['0'] ? path['0'][0]?.nodevalue : ''
                            td3.innerText = path['1'] ? path['1'][0]?.nodevalue : ''
                            tr.append(td1, td2, td3)
                            tbody.append(tr)
                        }
                        pathmodalbody.append(t)
                    }

                })
                .catch((error) => msg(error, 'danger'))
        })
    })
}


const highlight = () => {
    // higlight number with findings
    let susnumbers = document.querySelectorAll('.susnumber')
    susnumbers.forEach(susnumber => {
        if(susnumber.innerText === '') {
            return
        }
        if(parseInt(susnumber.innerText) > 0) {
            susnumber.style.backgroundColor = '#FFFF00'
        } 
        else {
            susnumber.style.backgroundColor = '#e3fbe3'
        }
    })
}



// filter button
const makeFilterModal = (e) => {
    e.preventDefault()

    if (FILTERCONFIG.onlyfindings) {
        onlyfindingsbtn.checked = true
    }

    if(FILTERCONFIG.limit) {
        limitinput.value = FILTERCONFIG.limit
    }

    if (FILTERCONFIG.inclusionmethods.length) {
        for (let i = 0; i < inclusionmethods.length; i++) {
            if (FILTERCONFIG.inclusionmethods.includes(inclusionmethods[i].value)) {
                inclusionmethods[i].selected = true
            }
        }
    }
    else{
        inclusionmethods[0].selected = true
    }

    if (FILTERCONFIG.differences.length) {
        for (let i = 0; i < differences.length; i++) {
            if (FILTERCONFIG.differences.includes(differences[i].value)) {
                differences[i].selected = true
            }
        }
    }
    else{
        differences[0].selected = true
    }

    if (FILTERCONFIG.filetypes.length) {
        for (let i = 0; i < filetypes.length; i++) {
            if (FILTERCONFIG.filetypes.includes(filetypes[i].value)) {
                filetypes[i].selected = true
            }
        }
    }
    else{
        filetypes[0].selected = true
    }

    if (FILTERCONFIG.browsers.length) {
        for (let i = 0; i < browsers.length; i++) {
            if (FILTERCONFIG.browsers.includes(browsers[i].value)) {
                browsers[i].selected = true
            }
        }
    }
    else{
        browsers[0].selected = true
    }

    savefilterbtn.onclick = () => {
        FILTERCONFIG.onlyfindings = onlyfindingsbtn.checked
        FILTERCONFIG.limit = limitinput.value
        FILTERCONFIG.inclusionmethods = []
        FILTERCONFIG.differences = []
        FILTERCONFIG.filetypes = []
        FILTERCONFIG.browsers = []

        for (let i = 1; i < inclusionmethods.length; i++) {
            if (inclusionmethods[i].selected) {
                FILTERCONFIG.inclusionmethods.push(inclusionmethods[i].value)
            }
        }

        for (let i = 1; i < differences.length; i++) {
            if (differences[i].selected) {
                FILTERCONFIG.differences.push(differences[i].value)
            }
        }

        for (let i = 1; i < filetypes.length; i++) {
            if (filetypes[i].selected) {
                FILTERCONFIG.filetypes.push(filetypes[i].value)
            }
        }

        for (let i = 1; i < browsers.length; i++) {
            if (browsers[i].selected) {
                FILTERCONFIG.browsers.push(browsers[i].value)
            }
        }
        if(FILTERCONFIG.inclusionmethods.length === inclusionmethods.length -1){
            FILTERCONFIG.inclusionmethods = []
        }
        if(FILTERCONFIG.differences.length === differences.length -1){
            FILTERCONFIG.differences = []
        }
        if(FILTERCONFIG.filetypes.length === filetypes.length -1){
            FILTERCONFIG.filetypes = []
        }
        if(FILTERCONFIG.browsers.length === browsers.length -1){
            FILTERCONFIG.browsers = []
        }

        localStorage.setItem('FILTERCONFIG', JSON.stringify(FILTERCONFIG))
        location.reload()
    }

    resetfilterbtn.onclick = () => {
        localStorage.removeItem('FILTERCONFIG')
        location.reload()
    }

    filtermodal.toggle()
}