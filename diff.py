from graph_algorithms import diff
import json
import networkx



BLOCKLIST = ['CRAWLER_CONFIG', 'navigator.connection.downlink', 'navigator.connection.rtt', 'clientInformation.connection.rtt', 'document.lastModified', 'document.timeline.currentTime', 'performance', 'navigation.currentEntry.id', 'navigation.currentEntry.key', 'clientInformation.connection.downlink', 'XSL_inclusionMethod.contentDocument.timeline', 'XSL_inclusionMethod.contentDocument.lastModified', 'clientInformation.connection.effectiveType'] # 'XSL_events.error.0.filename', 'outerWidth', 'outerHeight', 'screenLeft', 'screenX', 'screenY', 'screenTop'


def convertToNetworkxGraph(g):
    # g is a json graph
    return networkx.node_link_graph(
        g,
        directed=True,
        multigraph=True,
        source="source",
        target="target",
        key="key",  # key and edgelabel are redundant. We duplicate edgelabel to key because networkx does delete this attribute while importing
        name="name"
)


def diffGraphs(g1, g2):

    G1 = convertToNetworkxGraph(json.loads(g1))
    G2 = convertToNetworkxGraph(json.loads(g2))

    return diff([G1, G2], path_exclude_keywords=BLOCKLIST)



