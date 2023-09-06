

const msg = (m, color = 'primary') => {
    msgbox.style.display = (m) ? "block" : "none";
    msgbox.classList.remove('alert-success', 'alert-danger', 'alert-primary')
    msgbox.classList.add(`alert-${color}`)
    msgbox.innerText = m
}



window.mainmodal = new bootstrap.Modal(document.getElementById('mainmodal'))



runnerbtn.onclick = (e) => {
    e.preventDefault();
    let total = document.querySelectorAll('#inclusionmethods option:checked').length
        * document.querySelectorAll('#differences option:checked').length
        * document.querySelectorAll('#filetypes option:checked').length
        * document.querySelectorAll('#browsers option:checked').length
    if (confirm(`Are you sure you want to start ${total} testcases? `)) {

        fetch('/runner', {
            method: runform.method,
            body: new URLSearchParams([...(new FormData(runform))]),
        })
            .then((r) => r.text())
            .then((t) => msg(t, 'success'))
            .catch((error) => msg(error, 'danger'))
    }

}

deleterbtn.onclick = (e) => {
    e.preventDefault();
    let total = document.querySelectorAll('#inclusionmethods option:checked').length
        * document.querySelectorAll('#differences option:checked').length
        * document.querySelectorAll('#filetypes option:checked').length
        * document.querySelectorAll('#browsers option:checked').length
    if (confirm(`Are you sure you want to delete ${total} testcases? `)) {

        fetch('/deleter', {
            method: runform.method,
            body: new URLSearchParams([...(new FormData(runform))]),
        })
            .then((r) => r.text())
            .then((t) => msg(t, 'success'))
            .catch((error) => msg(error, 'danger'))
    }

}

results_show_filter.onclick = (e) => {
    e.preventDefault();
    runform.action = '/admin'
    runform.submit();
}

results_show_filter_clear.onclick = (e) => {
    e.preventDefault()
    document.location = '/admin'
}

results_show_findings.onclick = (e) => {
    e.preventDefault();
    document.location = '/admin?findings=1'


}
results_show_latest.onclick = (e) => {
    e.preventDefault()
    document.location = '/admin'
}



purge_db.onclick = () => {
    // show prompt to confirm
    if (confirm('Are you sure you want to purge the database?')) {
        fetch('/purge', {
            method: 'POST',
            body: '',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .then((r) => r.text())
            .then((t) => { msg(t, 'success') })
            .catch((error) => msg(error, 'danger'))
    }
}

resetstate.onclick = () => {
    // show prompt to confirm
    if (confirm('Are you sure you want to set all states to 0?')) {
        fetch('/resetstate', {
            method: 'POST',
            body: '',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .then((r) => r.text())
            .then((t) => { msg(t, 'success') })
            .catch((error) => msg(error, 'danger'))
    }
}

delete_queue.onclick = () => {
    fetch('/flush', {
        method: 'POST',
        body: '',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then((r) => r.text())
        .then((t) => msg(t, 'success'))
        .catch((error) => msg(error, 'danger'))
}

tag_start.onclick = () => {
    fetch('/tags/start', {
        method: 'POST',
        body: '',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
        .then((r) => r.text())
        .then((t) => msg(t, 'success'))
        .catch((error) => msg(error, 'danger'))
}

tag_clean.onclick = () => {
    fetch('/tags/clean', {
        method: 'POST',
        body: '',
    })
        .then((r) => r.text())
        .then((t) => msg(t, 'success'))
        .catch((error) => msg(error, 'danger'))
}



show_status.onclick = async (e) => {
    // show status in modal
    e.preventDefault()
    mainmodalbody.innerText = 'Loading...'
    mainmodaltitle.innerText = `Status`
    mainmodal.toggle()

    fetch('/status')
        .then((r) => r.json())
        .then((j) => {
            let pre = document.createElement('pre')

            pre.innerText = JSON.stringify(j, null, 4)
            mainmodalbody.innerText = ''
            mainmodalbody.append(pre)
        })
        .catch((error) => msg(error, 'danger'))

}

let runbtns = document.querySelectorAll(".runbtn");
runbtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault()
        e.target.disabled = true
        console.log(`[+] running ${e.target.href}`)
        fetch(e.target.href)
            .then((r) => r.text())
            .then((t) => msg(t, 'success'))
            .catch((error) => msg(error, 'danger'))
    })
})

let switchbtns = document.querySelectorAll(".switchbtn")
switchbtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault()
        fetch(e.target.href)
            .then((r) => r.text())
            .then((t) => msg(t, 'success'))
            .catch((error) => msg(error, 'danger'))
    })
})

let tagbtns = document.querySelectorAll(".tagbtn")
tagbtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault()
        fetch(e.target.href)
            .then((r) => r.text())
            .then((t) => msg(t, 'success'))
            .catch((error) => msg(error, 'danger'))
    })
})

let deletebtns = document.querySelectorAll(".deletebtn")
deletebtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault()
        // hide row and delete from db
        e.target.parentElement.parentElement.style.display = "none"
        fetch(e.target.href)
            .then((r) => r.text())
            .then((t) => msg(t, 'success'))
            .catch((error) => msg(error, 'danger'))

    })
})

let pathbtns = document.querySelectorAll(".pathbtn")
pathbtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault()
        // show path in modal
        mainmodalbody.innerText = 'Loading...'
        mainmodaltitle.innerText = `Differences`

        mainmodal.toggle()

        fetch(e.target.href)
            .then((r) => r.json())
            .then((j) => {
                if (j?.paths?.length === 0) {
                    mainmodalbody.innerText = 'No differences found!'
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
                    mainmodalbody.innerText = ''

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
                    mainmodalbody.append(t)
                }

            })
            .catch((error) => msg(error, 'danger'))
    })
})



let showdifference = document.querySelectorAll(".showdifference")
showdifference.forEach((btn) => {
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

let showinclusion = document.querySelectorAll(".showinclusion")
showinclusion.forEach((btn) => {
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


let logbtns = document.querySelectorAll(".logsbtn");
logbtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault()
        mainmodalbody.innerText = ''
        mainmodaltitle.innerText = 'Logs'
        let code = document.createElement('code')
        mainmodal.toggle()
        fetch(e.target.href)
            .then((r) => r.text())
            .then((t) => {
                code.innerText = t
                mainmodalbody.append(code)

            })
    })
})


let detailsbtns = document.querySelectorAll(".detailsbtn");
detailsbtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        e.preventDefault()
        mainmodalbody.innerText = 'Loading ...'
        mainmodaltitle.innerText = 'Test Case Details'

        let div = document.createElement('div')
        div.classList.add('m-2')

        mainmodal.toggle()
        // root of changes

        fetch(e.target.href)
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
                if (j.structural_difference.roots_of_change) {
                    for (let i of j.structural_difference.roots_of_change) {
                        let p = document.createElement('span')
                        p.classList.add('d-block', 'mx-2')
                        p.innerText = `${i.path}, (${i.type})`
                        div.append(p)

                    }
                    div.append(document.createElement('hr'))
                }





                if (j.structural_difference.connected_components) {
                    let graphnum = 1
                    let h2 = document.createElement('h5')
                    h2.innerText = 'Structural Changes'
                    div.append(h2)
                    for (let uuid in j.structural_difference.connected_components) {
                        let b = document.createElement('span')
                        b.classList.add('d-block', 'fw-semibold')
                        b.innerText = `Graph UUID ${graphnum}: ${uuid}`
                        div.append(b)
                        graphnum++
                        for (let cc of j.structural_difference.connected_components[uuid]) {
                            let p = document.createElement('span')
                            p.classList.add('mx-2')
                            p.innerText = `${cc.longest_common_prefix}* (${cc.number_of_nodes ? cc.number_of_nodes : '-'} nodes, ${cc.number_of_edges ? cc.number_of_edges : '-'} edges)`
                            div.append(p)
                        }

                    }

                }


                mainmodalbody.innerText = ''
                mainmodalbody.append(div)

            })
    })
})



const highlight = (selector, limit) => {
    let susnumbers = document.querySelectorAll(selector)
    susnumbers.forEach((susnumber => {
        if (susnumber.innerText === '') {
            return
        }
        if (parseInt(susnumber.innerText) > limit) {
            susnumber.style.backgroundColor = '#FFFF00'
        }
        else {
            susnumber.style.backgroundColor = '#e3fbe3'
        }
    }))
}



highlight('.susnumber', 0)




