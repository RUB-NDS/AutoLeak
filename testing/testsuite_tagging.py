testcases = '''XSL_perf.paint
document.body.clientHeight
0.document.readyState
0.frameElement.XSL_events
XSL_perf.resource
document.body.lastElementChild.XSL_events.error
document.body.lastElementChild.XSL_events.load
document.body.lastElementChild.clientHeight
document.body.lastElementChild.clientWidth
document.body.lastElementChild.height
document.body.lastElementChild.naturalHeight
document.body.lastElementChild.naturalWidth
document.body.lastElementChild.offsetHeight
document.body.lastElementChild.offsetTop
document.body.lastElementChild.offsetWidth
document.body.lastElementChild.scrollHeight
document.body.lastElementChild.scrollWidth
document.body.lastElementChild.width
document.body.lastElementChild.y
document.body.offsetHeight
document.body.scrollHeight
XSL_perf.resource
document.activeElement.lastChild.contentDocument
document.activeElement.lastChild.contentWindow
document.lastElementChild.offsetHeight'''.splitlines()

testcases = list(set(testcases))
