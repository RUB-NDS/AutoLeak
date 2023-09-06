(async function () {

    var Crawler = function () {

        /* Create the crawler object, which we will return later on. */
        var newCrawler = {

            log: {
                serverLogQueue: [],
                interval: null,
                crit: function (module, message, uuid) {
                    // If debugging is disabled, return.
                    if (this.config.localLogLevel >= 1 || this.config.serverLogLevel >= 1 || this.config.alertLogLevel >= 1 || this.config.domLogLevel >= 1)
                        try { this.log(1, module, message, uuid); } catch (discardedError) { }
                    throw message;
                },
                error: function (module, message, uuid) {
                    if (this.config.localLogLevel >= 2 || this.config.serverLogLevel >= 2 || this.config.alertLogLevel >= 2 || this.config.domLogLevel >= 2)
                        try { this.log(2, module, message, uuid); } catch (discardedError) { }
                },
                warn: function (module, message, uuid) {
                    if (this.config.localLogLevel >= 3 || this.config.serverLogLevel >= 3 || this.config.alertLogLevel >= 3 || this.config.domLogLevel >= 3)
                        try { this.log(3, module, message, uuid); } catch (discardedError) { }
                },
                progress: function (module, message, uuid) {
                    if (this.config.localLogLevel >= 4 || this.config.serverLogLevel >= 4 || this.config.alertLogLevel >= 4 || this.config.domLogLevel >= 4)
                        try { this.log(4, module, message, uuid); } catch (discardedError) { }
                },
                info: function (module, message, uuid) {
                    if (this.config.localLogLevel >= 5 || this.config.serverLogLevel >= 5 || this.config.alertLogLevel >= 5 || this.config.domLogLevel >= 5)
                        try { this.log(5, module, message, uuid); } catch (discardedError) { }
                },
                verbose: function (module, message, uuid) {
                    if (this.config.localLogLevel >= 6 || this.config.serverLogLevel >= 6 || this.config.alertLogLevel >= 6 || this.config.domLogLevel >= 6)
                        try { this.log(6, module, message, uuid); } catch (discardedError) { }
                },
                debug: function (module, message, uuid) {
                    if (this.config.localLogLevel >= 7 || this.config.serverLogLevel >= 7 || this.config.alertLogLevel >= 7 || this.config.domLogLevel >= 7)
                        try { this.log(7, module, message, uuid); } catch (discardedError) { }
                },

                /**
                 * internal log function
                 * @private
                 */
                log: function (priority, module, message, uuid) {
                    console.log(priority, module, message, uuid)
                    //TODO refine log message structure
                    if (this.config.instanceUUID === undefined) {
                        this.config.instanceUUID = util.uuid4();
                    }

                    var h = "-1";
                    var m = "-1";
                    try {
                        var date = new Date();
                        h = String(date.getHours());
                        m = String(date.getMinutes())
                    } catch (err) {
                    }
                    var uuidSegment = "";
                    if (uuid) {
                        uuidSegment = "[" + uuid + "]";
                    }
                    var priorityEnum = ["", "crit", "error", "warn", "progress", "info", "verbose", "debug"];

                    var fullMessage = h + ":" + m + " " + priorityEnum[priority] + uuidSegment + " [" + module + "]: " + message;
                    if (this.config.serverLogLevel >= priority) {
                        this.serverLogQueue.push(fullMessage);
                        this.checkSendParameters();
                    }

                    if (this.config.alertLogLevel >= priority) {
                        if (typeof alert === "function")
                            try { alert(fullMessage); } catch (err) { }
                    }

                    if (this.config.domLogLevel >= priority && this.config.domLogElementId != undefined) {
                        try {
                            if (typeof (document) != "undefined" && typeof (document.getElementById) == "function") {
                                var logelem = document.getElementById(this.config.domLogElementId);
                                if (!(logelem === null || logelem === undefined)) {
                                    logelem.textContent += fullMessage + "\n";
                                }
                            }
                        } catch (err) { }
                    }

                    if (this.config.localLogLevel >= priority) {
                        //https://developer.mozilla.org/en-US/docs/Web/API/console#Browser_compatibility
                        var log, error, warn, info, debug;
                        if (console) {
                            log = console.log || console.error || console.info || console.debug || function () { }; // something has to exist
                            error = console.error || log;
                            warn = console.warn || log;
                            info = console.info || log;
                            debug = console.debug || log;
                        } else {
                            //RIP
                            error = function () { };
                            warn = function () { };
                            info = function () { };
                            debug = function () { };
                        }
                        switch (priority) {
                            case 1:
                                if (typeof (message) != "string" && typeof (message) != "number" && typeof (message) != "boolean")
                                    error(message);
                                else
                                    error(fullMessage);
                                break;
                            case 2:
                                if (typeof (message) != "string" && typeof (message) != "number" && typeof (message) != "boolean")
                                    error(message);
                                else
                                    error(fullMessage);
                                break;
                            case 3:
                                if (typeof (message) != "string" && typeof (message) != "number" && typeof (message) != "boolean")
                                    warn(message);
                                else
                                    warn(fullMessage);
                                break;
                            case 4:
                            case 5:
                            case 6:
                                if (typeof (message) != "string" && typeof (message) != "number" && typeof (message) != "boolean")
                                    info(message);
                                else
                                    info(fullMessage);
                                break;
                            case 7:
                                if (typeof (message) != "string" && typeof (message) != "number" && typeof (message) != "boolean")
                                    debug(message);
                                else
                                    debug(fullMessage);
                                break;
                        }
                    }
                },
                /**
                 * checks if the the log Queue should be send to the server yet
                 * @private
                 */
                checkSendParameters: function () {
                    var self = this;
                    if (!this.interval) {
                        this.interval = setInterval(function () {
                            if (self.serverLogQueue.length > 0)
                                self.flush();
                        }, this.config.maxLogQueueTimeout);
                    }
                    if (this.serverLogQueue.length >= this.config.maxLogQueueSize) {
                        this.flush();
                    }
                },

                flush: function () {
                    if (this.serverLogQueue.length > 0) {
                        extract.sendLog(this.config.instanceUUID, this.serverLogQueue);
                        this.serverLogQueue = []
                    }
                },
            }
            ,
            util: {
                /* Check which timeout, alert and log to use */

                setTimeout: function (a, b) {
                    if (typeof (window.setTimeout) === "function") {
                        window.setTimeout(a, b)
                    } else {
                        /* This is PDF Javascript */
                        app.setTimeOut(a, b)
                    }
                },

                setInterval: function (a, b) {
                    if (typeof (window.setInterval) === "function") {
                        return window.setInterval(a, b)
                    } else {
                        /* This is PDF Javascript */
                        return app.setInterval(a, b)
                    }
                },

                clearInterval: function (a) {
                    if (typeof (window.clearInterval) === "function") {
                        return window.clearInterval(a)
                    } else {
                        /* This is PDF Javascript */
                        return app.clearInterval(a)
                    }
                },

                alert: function (a) {
                    if (typeof (window.alert) === "function") {
                        window.alert(a)
                    } else if (typeof (alert) === "function") {
                        alert(a)
                    } else if (typeof (app.alert) === "function") {
                        /* This is PDF Javascript */
                        app.alert(a)
                    } else {
                        throw "No alert function found";
                    }
                },

                Promise: function (executor) {
                    var util = this;
                    var promise = {};
                    promise.executor = executor || function () {
                    };
                    promise["[[PromiseStatus]]"] = "pending";
                    promise["[[PromiseValue]]"] = undefined;
                    promise.then = function (then) {
                        promise.success = then
                    };
                    promise.catch = function (fails) {
                        promise.fail = fails
                    };
                    promise.success = function () {
                    };
                    promise.fail = function () {
                    };

                    promise.resolve = function (data) {
                        if (promise["[[PromiseStatus]]"] == "pending") {
                            promise["[[PromiseValue]]"] = data;
                            promise["[[PromiseStatus]]"] = "resolved";
                            util.setTimeout(function () {
                                promise.success(data)
                            })
                        }
                    };

                    promise.reject = function (data) {
                        if (promise["[[PromiseStatus]]"] == "pending") {
                            promise["[[PromiseValue]]"] = data;
                            promise["[[PromiseStatus]]"] = "rejected";
                            util.setTimeout(function () {
                                promise.fail(data)
                            })
                        }
                    };
                    util.setTimeout(function () {
                        promise.executor(promise.resolve, promise.reject)
                    });

                    return promise;
                },

                check_identity: function (thingA, thingB) {
                    if (Object === undefined || Object.is === undefined) {
                        return thingA === thingB
                    }
                    var identity_is = Object.is(thingA, thingB);
                    var identity_triple_equal = thingA === thingB;
                    var is_both_NaN = typeof (thingA) == "number" && String(thingA) == "NaN" && typeof (thingB) == "number" && String(thingB) == "NaN";
                    if (is_both_NaN == false && identity_is != identity_triple_equal && is_both_NaN == false) {
                        log.warn("util", "identity mismatch of the following two objects:");
                        log.warn("util", thingA);
                        log.warn("util", thingB);
                    }
                    return identity_triple_equal || identity_is;
                },

                uuid4: function () {
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                    });
                },

                keys: function (obj) {
                    var keys = [];
                    for (var key in obj) {
                        keys.push(key);
                    }
                    return keys;
                },

                Map: function (obj) {
                    return new Map(obj);
                },

                Set: function (obj) {
                    return new Set(obj)
                }

            }
            ,
            MultiDiGraph: function () {
                /* This code mirrors the functionality of NetworkX.MultiDiGraph */
                var log = this.log;
                return {
                    edges: {}, /* dict of dict of dict: this.edges[u][v][k] => data */
                    nodes: {}, /* dict: .nodes[n] == data */
                    nodeKeysSortedByTime: [], /* New keys (node-id) to the 'nodes' dictionary are appended. Used for iterating. */
                    edgeKeysSortedByTime: [], /* New keys ([u,v,k]) to the 'edges' dictionary are appended. Used for iterating. */
                    metadata: {}, /* dict. This is the graph metadata, e.g. the uuid and the name */
                    writeBlocked: false, /* Flag for pausing the crawler from writing to the graphs */
                    numberOfEdges: 0,
                    numberOfNodes: 0,
                    isFrozen: false,
                    preventUnfrozenIteration: true,
                    nodeAdditionObservers: [],
                    edgeAdditionObservers: [],
                    addNode: function (nodeID, nodeData) {
                        if (this.isFrozen) {
                            log.warn("Graph is frozen, unable to add node")
                            return;
                        }

                        /* Adds a node to the graph */
                        var nodeData = nodeData || {}
                        nodeData.nodeid = nodeID;
                        if (this.nodes[nodeID] == undefined) {
                            this.numberOfNodes += 1;
                            this.nodes[nodeID] = nodeData;
                            this.nodeKeysSortedByTime.push(nodeID);
                            // Call all observer Callback functions for the added node.
                            for (var i = 0; i < this.nodeAdditionObservers; i++) {
                                /* TODO: test if this is working fine */
                                this.nodeAdditionObservers[i](nodeID, nodeData);
                            }
                        } else {
                            log.error("graph", "node id already exists in the graph!")
                        }
                    },
                    addEdge: function (sourceID, targetID, edgeLabel, edgeData) {
                        if (this.isFrozen) {
                            log.error("Graph is frozen, unable to add edge")
                            return;
                        }
                        /* Adds an edge between source and target to the graph */
                        var prefixedEdgeLabel = "[graph]:" + String(typeof edgeLabel) + String(edgeLabel);
                        if (this.edges[sourceID] == undefined) {
                            this.edges[sourceID] = {};
                        }
                        var nextLevel = this.edges[sourceID];

                        if (nextLevel[targetID] == undefined) {
                            nextLevel[targetID] = {};
                        }
                        nextLevel = nextLevel[targetID];
                        if (nextLevel[prefixedEdgeLabel] == undefined) {
                            this.numberOfEdges += 1; /* new edge */
                            edgeData.sourceid = sourceID;
                            edgeData.targetid = targetID;
                            nextLevel[prefixedEdgeLabel] = edgeData;
                            this.edgeKeysSortedByTime.push([sourceID, targetID, prefixedEdgeLabel]);

                            // Call all observer Callback functions for the added edge.
                            for (var i = 0; i < this.edgeAdditionObservers; i++) {
                                /* TODO: test if this is working fine */
                                this.edgeAdditionObservers[i](sourceID, targetID, prefixedEdgeLabel, edgeData);
                            }
                        } else {
                            log.error("graph", "duplicate write access on graph[" + sourceID + "][" + targetID + "][" + edgeLabel + "] was denied: edge already exists.");
                        }
                    },
                    removeEdge: function (source, target, key) {
                        if (source in this.edges) {
                            if (target in this.edges[source]) {
                                if (key in this.edges[source][target]) {
                                    delete this.edges[source][target][key]
                                }
                                if (Object.keys(this.edges[source][target]).length == 0) {
                                    delete this.edges[source][target]
                                }
                            }
                            if (Object.keys(this.edges[source]).length == 0) {
                                delete this.edges[source]
                            }
                        }
                    },
                    iterNodes: function () {
                        /* Returns an iterator-like object. Use .next() to iterate over the edges. */
                        var graph_reference = this;
                        /* Only iterate over frozen graphs.*/
                        if ((!this.isFrozen) && this.preventUnfrozenIteration) {
                            log.warn("graph", "Do not iterate over non-frozen graph!")
                        }
                        return {
                            graph_reference: graph_reference,
                            current: 0,
                            next: function () {
                                if (this.current < this.graph_reference.nodeKeysSortedByTime.length) {
                                    return this.graph_reference.nodes[this.graph_reference.nodeKeysSortedByTime[this.current++]];
                                }
                            },
                            available: function () {
                                return this.graph_reference.nodeKeysSortedByTime.length - this.current;
                            }
                        }
                    },
                    iterEdges: function () {
                        /* Returns an iterator-like object. Use .next() to iterate over the edges. */
                        var graph_reference = this;
                        /* Only iterate over frozen graphs.*/
                        if ((!this.isFrozen) && this.preventUnfrozenIteration) {
                            log.warn("graph", "Do not iterate over non-frozen graph!")
                        }

                        /* explode the hierarchical edges into a flat list of u,v,k,data, if not done before. Caching this will speed up repeated iterations. */
                        //				if (typeof (this._edges_flat) === "undefined") {
                        //					this._edges_flat = [];
                        //					for (var _u in this.edges) {
                        //						for (var _v in this.edges[_u]) {
                        //							for (var _k in this.edges[_u][_v]) {
                        //								var edge = {
                        //									u: _u,
                        //									v: _v,
                        //									k: _k,
                        //									data: this.edges[_u][_v][_k]
                        //								}
                        //								this._edges_flat.push(edge);
                        //							}
                        //						}
                        //					}
                        //				}

                        return {
                            graph_reference: graph_reference,
                            current: 0,
                            next: function () {
                                if (this.current < this.graph_reference.edgeKeysSortedByTime.length) {
                                    var uvk = this.graph_reference.edgeKeysSortedByTime[this.current++];
                                    return {
                                        u: uvk[0],
                                        v: uvk[1],
                                        k: uvk[2],
                                        data: this.graph_reference.edges[uvk[0]][uvk[1]][uvk[2]]
                                    }
                                }
                            },
                            available: function () {
                                return this.graph_reference.nodeKeysSortedByTime.length - this.current;
                            }
                        }
                    },
                    freeze: function () {
                        this.isFrozen = true;
                    },
                    toJSON: function () {
                        /* returns a json in a format that networkx can parse */
                        var nodes_flat = []
                        var edges_flat = []
                        for (var i = 0; i < this.edgeKeysSortedByTime.length; i++) {
                            var uvk = this.edgeKeysSortedByTime[i];
                            var edge = this.edges[uvk[0]][uvk[1]][uvk[2]];
                            edge.key = edge.edgelabel
                            edge.source = edge.sourceid;
                            edge.target = edge.targetid;
                            edges_flat.push(edge)
                        }
                        for (var i = 0; i < this.nodeKeysSortedByTime.length; i++) {
                            var n = this.nodes[this.nodeKeysSortedByTime[i]];
                            n.name = n.nodeid;
                            nodes_flat.push(n)
                        }
                        return {
                            'directed': true,
                            'multigraph': true,
                            'graph_uuid': this.metadata.graph_uuid,
                            'graph': this.metadata,
                            'nodes': nodes_flat,
                            'links': edges_flat
                        }
                    },
                    toTable: function (edgelabels, nodelabels) {
                        var tabledata = []
                        for (var u in this.edges) {
                            for (var v in this.edges[u]) {
                                for (var k in this.edges[u][v]) {
                                    var row = []
                                    var edgeAttr = this.edges[u][v][k]
                                    var nodeAttr = this.nodes[edgeAttr['targetid']]
                                    if (edgelabels instanceof Array) {
                                        for (var i in edgelabels) {
                                            row.push(edgeAttr[edgelabels[i]])
                                        }
                                    }
                                    if (nodelabels instanceof Array) {
                                        for (var i in nodelabels) {
                                            row.push(nodeAttr[nodelabels[i]])
                                        }
                                    }
                                    tabledata.push(row)
                                }
                            }
                        }
                        return tabledata
                    },
                    firstpaths: function () {
                        return this.toTable(['firstpath'])
                    },
                    toHTMLTable: function (edgelabels, nodelabels) {
                        var edgelabels = edgelabels || ["firstpath"]
                        var nodelabels = nodelabels || ["nodetype", "nodevalue"];
                        var tabledata = this.toTable(edgelabels, nodelabels)
                        var table = document.createElement("TABLE");  //makes a table element for the page
                        table.border = 1;
                        table.style.borderCollapse = "collapse"
                        for (var i in tabledata) {
                            var row = table.insertRow(i);
                            for (var j in tabledata[i]) {
                                row.insertCell().textContent = tabledata[i][j]
                            }
                        }

                        var header = table.createTHead();
                        var headerRow = header.insertRow(0);
                        var headerlabels = edgelabels.concat(nodelabels)
                        for (var i in headerlabels) {
                            headerRow.insertCell(i).textContent = headerlabels[i];
                        }

                        return table;
                    },
                    toJSONChunked: function (multiDiGraph, chunkSize) {
                        multiDiGraph = this //monkeypatch
                        var chunkIndex = 1;
                        if (chunkSize === undefined) {
                            chunkSize = config.defaultChunkSize;
                        }
                        return {
                            nodeIter: multiDiGraph.iterNodes(),
                            edgeIter: multiDiGraph.iterEdges(),
                            nodesFinished: false,
                            edgesFinished: false,
                            metaFinished: false,
                            uuid: function () {
                                if (typeof (multiDiGraph.graph_uuid) == "string" && multiDiGraph.graph_uuid != "")
                                    return multiDiGraph.graph_uuid
                                else
                                    throw "buffering";
                            },
                            serializeNodes: function () {
                                var data;
                                //give nodes
                                data = "{\"chunk_index\": " + chunkIndex++ + ",\n" +
                                    "\"serialization_id\": \"" + multiDiGraph.metadata.graph_uuid + "\",\n" +
                                    "\"entities_per_chunk\": " + chunkSize + ",\n" +
                                    "\"chunk_type\": \"nodes\",\n" +
                                    "\"wrapped_items\": [\n";
                                var firstn = true;
                                for (var i = 0; i < chunkSize; i++) {
                                    var node = this.nodeIter.next();
                                    if (node == undefined) {
                                        if (multiDiGraph.isFrozen) {
                                            // We are only finished with uploading once the graph is frozen
                                            this.nodesFinished = true;
                                        }
                                        break;
                                    }
                                    if (firstn)
                                        firstn = false;
                                    else
                                        data += ",\n";
                                    data += "{";

                                    var first1 = true;
                                    for (var key in node) {
                                        if (first1)
                                            first1 = false;
                                        else
                                            data += ",\n";
                                        data += "\"" + encodeURI(key) + "\":\"" + encodeURI(node[key]) + "\"";
                                        if (config.freeMemoryAfterUpload)
                                            delete node[key];
                                    }
                                    data += "}";
                                }
                                data += "]\n}";
                                return data;
                            },
                            serializeEdges: function () {
                                var data;
                                //give edges
                                data = "{\"chunk_index\": " + chunkIndex++ + ",\n" +
                                    "\"serialization_id\": \"" + multiDiGraph.metadata.graph_uuid + "\",\n" +
                                    "\"entities_per_chunk\": " + chunkSize + ",\n" +
                                    "\"chunk_type\": \"edges\",\n" +
                                    "\"wrapped_items\": [\n";
                                var firste = true;
                                for (var i = 0; i < chunkSize; i++) {
                                    var edge = this.edgeIter.next();
                                    if (edge == undefined) {
                                        if (multiDiGraph.isFrozen) {
                                            // We are only finished with uploading once the graph is frozen
                                            this.edgesFinished = true;
                                        }
                                        break;
                                    }
                                    if (firste)
                                        firste = false;
                                    else
                                        data += ",\n";
                                    data += "{";

                                    var first2 = true;
                                    for (var key in edge.data) {
                                        if (first2)
                                            first2 = false;
                                        else
                                            data += ",\n";
                                        data += "\"" + encodeURI(key) + "\":\"" + encodeURI(edge.data[key]) + "\"";
                                        if (config.freeMemoryAfterUpload)
                                            delete edge.data[key];

                                    }
                                    data += "}";
                                }
                                data += "]\n}";
                                return data;
                            },
                            shift: function () {
                                if (this.nodesFinished && this.edgesFinished && this.metaFinished) {
                                    return undefined;
                                }

                                /* Upload parts of the unfrozen graph when they become available.
                                 Throws exception if the buffer is not full. */
                                if (!multiDiGraph.isFrozen) {
                                    if (multiDiGraph.metadata === undefined) {
                                        throw "buffering";
                                    }
                                    var usedIter = null;
                                    var serializerFunction = null;
                                    if (this.edgeIter.available() > this.nodeIter.available()) {
                                        usedIter = this.edgeIter;
                                        serializerFunction = this.serializeEdges;
                                    } else {
                                        usedIter = this.nodeIter;
                                        serializerFunction = this.serializeNodes;
                                    }
                                    if (usedIter.available() >= chunkSize) {
                                        var serializedData = serializerFunction.call(this) /* TODO: does .call work in pdf js? */
                                        if (usedIter.available() >= (3 * chunkSize)) {
                                            log.verbose("serializer", "pausing crawler, uploading")
                                            console.log("pause")
                                            multiDiGraph.writeBlocked = true;
                                        }
                                        return serializedData;
                                    } else {
                                        log.verbose("serializer", "resuming crawler, there is still data to upload")
                                        console.log("resume")
                                        multiDiGraph.writeBlocked = false;
                                        throw "buffering";
                                    }
                                }

                                /* The graph is frozen. Continue normal upload until done. */
                                if (!this.nodesFinished) {
                                    return this.serializeNodes()
                                }
                                if (!this.edgesFinished) {
                                    return this.serializeEdges()
                                }
                                if (!this.metaFinished) {
                                    //give metadata
                                    data = "{\"chunk_index\": " + 0 + ",\n" +
                                        "\"serialization_id\": \"" + multiDiGraph.metadata.graph_uuid + "\",\n" +
                                        "\"entities_per_chunk\": " + chunkSize + ",\n" +
                                        "\"chunk_type\": \"graph\",\n" +
                                        "\"wrapped_items\": [\n{\n";
                                    var first = true;
                                    for (var key in multiDiGraph.metadata) {
                                        if (first)
                                            first = false;
                                        else
                                            data += ",\n";
                                        data += "\"" + encodeURI(key) + "\":\"" + encodeURI(multiDiGraph.metadata[key]) + "\"";
                                    }
                                    data += "}\n]\n}";
                                    this.metaFinished = true;
                                    return data;
                                }
                            }
                        }
                    },
                }
            }
            ,
            upload: function (graphOrNull, uploadURLOrNull, uploadIntervalOrNull) {
                var uploadURL = uploadURLOrNull || this.config.serverURL
                var uploadInterval = uploadIntervalOrNull || this.config.uploadInterval
                var graphToUpload = graphOrNull || this.graph;
                this.log.progress("upload", "Starting upload.");
                var self = this

                var chunksUploadQueue = [
                    {
                        "chunk_index": 0,
                        "serialization_id": graphToUpload.graph_uuid,
                        "entities_per_chunk": 1,
                        "chunk_type": "completegraph",
                        "wrapped_items": [graphToUpload.toJSON()]
                    }
                ]

                return this.util.Promise(function (resolve, reject) {
                    var chunkIndex = 0;
                    var interval = self.util.setInterval(function () {
                        try {
                            var chunk = chunksUploadQueue.shift()
                            var http, url;
                            if (chunk === undefined) {
                                throw "chunk is undefined"
                            }
                            http = new XMLHttpRequest();
                            url = uploadURL + "?type=graphfragment&uuid=" + graphToUpload.graph_uuid + "&number=" + (chunkIndex);
                            if (chunksUploadQueue.length == 0) {
                                url += "&finished=true&numberOfUploads=" + String(chunkIndex + 1);
                            }
                            http.open("POST", url, true);
                            http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                            http.send(JSON.stringify(chunk));
                            chunkIndex += 1
                            if (chunksUploadQueue.length == 0) {
                                self.log.progress("upload", "End of upload.")
                                self.util.clearInterval(interval)
                                resolve()
                            }
                        } catch (err) {
                            if (err == "buffering") {
                                log.debug("upload", "Buffering graphdiscovery for upload");
                            } else {
                                throw err;
                            }
                        }
                    }, uploadInterval);
                })
            }
            ,
            asDownloadDialog: function (graphOrNull) {
                var graph = graphOrNull || this.graph;
                var element = document.createElement('a');
                var file = new File([JSON.stringify(graph)], graph.graph_uuid + ".json");
                var objectUrl = URL.createObjectURL(file);
                element.setAttribute('href', objectUrl);
                element.setAttribute('download', graph.graph_uuid + ".json");
                element.style.display = 'none';
                element.click();
            }
            ,

            /* This is the config of the crawler. It gets initialized with default values, which can be overwritten. */
            config: {

                version: "3.01",
                instanceUUID: undefined,
                /* Extraction */
                serverURL: "", /* The upload URL */
                beaconURL: undefined,  /* The beacon URL */
                logURL: "",/* The log drop URL */
                crawledURL: "", /* The url on which the crawler starts */

                /*Standalone-Mode*/
                entrypoint: "window", /* in standalone script-mode, this is the dompath at which we start crawling. Set via URL. */
                mode: "async", /* crawl sync or async. Only relevant in standalone mode*/

                /* Logging */
                /*  Levels:
                    0 - silent (no logging),
                    1 - critical,
                    2 - error,
                    3 - warn,
                    4 - progress (main code),
                    5 - info (crawler - list traversed objects)
                    6 - verbose (crawler - list properties per object)
                    7 - debug (crawler.discovery + crawler.analysis.property + crawler.analysis.object ) */
                serverLogLevel: 0,
                localLogLevel: 4,
                alertLogLevel: 2,
                domLogLevel: 0,
                domLogElementId: undefined, /* The ID of the element whose .textContent is used for showing debug output */
                logPropertySummaryPerObject: false, /* This will output one big string per object, containing all its properties. Careful! Can be really long string. */
                onNode: null,
                onEdge: null,

                /* Crawler Configuration */
                graph_uuid: "",
                maximumTraversalDepth: 1000, /* The maximum amount of steps the crawler will take */
                traversePrototypes: true, /* Whether to traverse prototypes or stop before them */
                stopAfterObjects: [], 		/* The crawler stops AT these objects. They will be part of the graph, but not queued for traversal. */
                stopBeforeObjects: [],		/* The crawler completely theses objects. They won't be part of the graph. */
                stopAfterProperties: [],		/* The crawler stops AT these edges. The target will be part of the graph, but not queued for traversal. */
                stopBeforeProperties: [],	/* The crawler completely ignores properties with this names. */
                historical: [], /* The list of historical property names */
                defaultValue: undefined, /* If the crawler does not fill a field (e.g. due to error), this value remains */
                defaultCrawlingDelay: 0,
                stopCrawlingUponEmptyQueue: true,

                /* Debugging */
                debugStepwise: false,

                /* Performance */
                asyncMaxObjectsPerStep: 100,
                asyncMaxDurationPerStep: 700, /* Browsers consider 1000ms to be a long task. Too long and the task might get halted by the browser! */
                uploadInterval: 100,
                defaultChunkSize: 10000, /* default for how many chunk to serialize at once */
                maxLogQueueSize: 1000,
                maxLogQueueTimeout: 1000 * 5,
                freeMemoryAfterUpload: false, /* If true, all assessments of edges and nodes will be DELETEd immediately after uploading.*/
                asyncUploadWhileCrawling: false, /* if true, the upload will run asynchronous to the crawling. Crawling slows down, but can be used to reduce memory in combination with freeMemoryAfterUpload */

                /* Switches for the different discovery methods */
                crossOriginFastMode: false, /* DEPRECATED. If this is enabled, the crawler assumes that the starting object is cross origin. This makes the crawling a lot faster */
                skipUnreadables: false,
                skipUndefined: false,
                skipNonDeterministics: true,
                skipHtmlAndTextProperties: true,
                skipAboutBlankDOMs: false,
                discoveryMethodForIn: true,
                discoveryMethodEntries: true,
                discoveryMethodKeys: true,
                discoveryMethodOwnPropertyNames: true,
                discoveryMethodOwnPropertySymbols: true,
                discoveryMethodOwnPropertyDescriptors: true,
                discoveryMethodKeysProperty: true,
                discoveryMethodLengthProperty: true,
                discoveryMethodReflectOwnKeys: true,
                discoveryMethodHistoricals: true,
                discoveryMethodClassGetMethods: true,
                discoveryMethodClassGetFields: true,
                discoveryMethodIndexChar: false,
                discoveryMethodSymbolUnscopables: true,
                discoveryMethodNewEnumerator: true,
                discoveryMethodGetPrototypeOf: true,
                discoveryMethodOwnPropertyDescriptorsObject: false, /* default off */
                discoveryMethodGetEntries: false,
                objectAnalysisMethodSerializations: false, 	/* Object serializations usually are time and memory consuming. Can be enabled for thoroughness, or disabled for performance. */

                addFromObject: function (parameterObject) {
                    Object.assign(this, parameterObject);
                },
                addFromURL: function (urlString) {
                    /* This feature only works in newer user agents. */
                    if (typeof URL === "function" && typeof URLSearchParams === "function" && typeof Object.assign === "function") {
                        var url = new URL(urlString);
                        var urlPars = new URLSearchParams(url.search)
                        var parameters = {}
                        var self = this
                        urlPars.forEach(function (parameterValue, parameterName) {
                            if (parameterName.endsWith("[]")) {
                                if (typeof parameters[parameterName] == "undefined") {
                                    parameters[parameterName.substring(0, parameterName.length - 2)] = []
                                }
                                parameters[parameterName.substring(0, parameterName.length - 2)].push(v)
                            } else {
                                if (typeof self[parameterName] == "number") parameterValue = parseInt(parameterValue);
                                if (typeof self[parameterName] == "boolean") {
                                    console.log("turning", parameterName, parameterValue, "into boolean")
                                    parameterValue = parameterValue === "true";
                                }
                                parameters[parameterName] = parameterValue
                            }
                        })
                        if (parameters.CRAWLER_CONFIG) {
                            parameters = JSON.parse(atob(parameters.CRAWLER_CONFIG))
                        }
                        this.addFromObject(parameters);
                    } else {
                        throw "URL parsing not implemented for legacy browsers / alternative clients";
                    }
                },

            }
            ,

            /* This first time setup of the crawler */
            init: function (startObject, localConfig, graphToStoreCrawlingResult) {
                /* This returns a new crawler object*/

                /* Test the identity function to assure a rudimentary operation */
                var identityTestObjectA = {};
                var identityTestObjectB = {};
                if (this.util.check_identity(identityTestObjectA, identityTestObjectA) != true
                    || this.util.check_identity(1, 1) != true
                    || this.util.check_identity(2, 2) != true
                    || this.util.check_identity(3, 3) != true
                    || this.util.check_identity(1, 2) != false
                    || this.util.check_identity(2, 3) != false
                    || this.util.check_identity(3, 1) != false
                    || this.util.check_identity("", "") != true
                    || this.util.check_identity("test", "test") != true
                    || this.util.check_identity("test", "nottest") != false
                    || this.util.check_identity(identityTestObjectA, identityTestObjectB) != false) {
                    log.warn("util", "Faulty identity function!")
                }

                this.graph = this.graph || this.MultiDiGraph(),

                    this.log.progress("This is crawler version " + this.config.version)

                this.log.info("crawler", "Checking the js engine features")

                /* Check which features can be used and store the information. This accelerates the crawler code much. */
                this.cachedFeatureChecks = {}
                try {
                    this.cachedFeatureChecks.canUseGetOwnPropertyDescriptor = typeof (Object.getOwnPropertyDescriptor) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseGetOwnPropertyDescriptor = false;
                }
                if (!this.cachedFeatureChecks.canUseGetOwnPropertyDescriptor) {
                    this.log.warn("crawler", "Missing core functionality 'Object.getOwnPropertyDescriptor'!")
                }

                try {
                    this.cachedFeatureChecks.canUseGetOwnPropertyDescriptors = typeof (Object.getOwnPropertyDescriptors) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseGetOwnPropertyDescriptors = false;
                }
                if (!this.cachedFeatureChecks.canUseGetOwnPropertyDescriptors) {
                    this.log.warn("crawler", "Missing core functionality 'Object.getOwnPropertyDescriptors'!")
                }

                try {
                    this.cachedFeatureChecks.canUseGetOwnPropertySymbols = typeof (Object.getOwnPropertySymbols) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseGetOwnPropertySymbols = false;
                }
                if (!this.cachedFeatureChecks.canUseGetOwnPropertySymbols) {
                    this.log.warn("crawler", "Missing core functionality 'Object.getOwnPropertySymbols'!")
                }

                try {
                    this.cachedFeatureChecks.canUseGetOwnPropertyNames = typeof (Object.getOwnPropertyNames) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseGetOwnPropertyNames = false;
                }
                if (!this.cachedFeatureChecks.canUseGetOwnPropertyNames) {
                    this.log.warn("crawler", "Missing core functionality 'Object.getOwnPropertyNames'!")
                }

                try {
                    this.cachedFeatureChecks.canUseEntries = typeof (Object.entries) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseEntries = false;
                }
                if (!this.cachedFeatureChecks.canUseEntries) {
                    this.log.warn("crawler", "Missing core functionality 'Object.entries'!")
                }

                try {
                    this.cachedFeatureChecks.canUseGetPrototypeOf = typeof (Object.getPrototypeOf) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseGetPrototypeOf = false;
                }
                if (!this.cachedFeatureChecks.canUseGetPrototypeOf) {
                    this.log.warn("crawler", "Missing core functionality 'Object.getPrototypeOf'!")
                }

                try {
                    this.cachedFeatureChecks.canUseUneval = typeof (uneval) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseUneval = false;
                }
                if (!this.cachedFeatureChecks.canUseUneval) {
                    this.log.warn("crawler", "Missing core functionality 'uneval'!")
                }

                try {
                    this.cachedFeatureChecks.canUseObjectIs = typeof (Object.is) == "function";
                } catch (err) {
                    this.cachedFeatureChecks.canUseObjectIs = false;
                }
                if (!this.cachedFeatureChecks.canUseObjectIs) {
                    this.log.warn("crawler", "Missing core functionality 'Object.is'!")
                }



                /* Override parts of it with the local config, if present. */
                this.log.info("crawler", "Generating crawler config")
                if (localConfig) {
                    /* This config is provided by the user. Because types might be wrong, we try to fix them. */
                    for (var key in localConfig) {
                        if (typeof parseInt == "function" && typeof this.config[key] == "number" && typeof localConfig[key] != "number") {
                            this.config[key] = parseInt(localConfig[key], 10)
                        } if (typeof this.config[key] == "boolean" && typeof localConfig[key] == "string") {
                            this.config[key] = localConfig[key] === "true";
                        } else {
                            this.config[key] = localConfig[key];
                            if (typeof this.config[key] != typeof localConfig[key]) {
                                this.log.warn("crawler", "Config value " + val + " has type " + (typeof localConfig[key]) + ", but should be " + (typeof this.config[key]))
                            }
                        }
                    }
                }

                try {
                    if (typeof window === "object" && typeof window.location === "object" && typeof window.location.href === "string") { this.config.crawledURL = window.location.href }
                }
                catch (err) {
                    this.log.warn("main", "Could not get the url from window.location.href! " + err);
                    this.log.warn("main", err);
                } if (this.config.skipHtmlAndTextProperties === true) {
                    this.config.stopBeforeProperties.push("innerHTML");
                    this.config.stopBeforeProperties.push("outerHTML");
                    this.config.stopBeforeProperties.push("textContent");
                }

                // turn those config objects into sets
                this.config.stopAfterObjects = this.util.Set(this.config.stopAfterObjects);
                this.config.stopBeforeObjects = this.util.Set(this.config.stopBeforeObjects);
                this.config.stopAfterProperties = this.util.Set(this.config.stopAfterProperties);
                this.config.stopBeforeProperties = this.util.Set(this.config.stopBeforeProperties);

                /* If we still don't have a uuid, create one. */
                this.config.graph_uuid = this.config.graph_uuid || this.util.uuid4();
                this.graph_uuid = this.config.graph_uuid;
                this.graph.graph_uuid = this.graph_uuid
                this.log.progress("crawler", "Graph uuid: " + this.config.graph_uuid)

                this.log.info("crawler", "Determined the graph uuid to be " + this.graph_uuid)

                /* Create the virtual entry node */
                var venPseudoAssessment = this.ObjectAssessment(this.config.defaultValue)
                venPseudoAssessment.isVEN = true
                venPseudoAssessment.traversalLevel = -1
                venPseudoAssessment.nodetype = "VEN"
                venPseudoAssessment.nodevalue = "VEN"

                this.graph.addNode(this.getNewNodeID(), venPseudoAssessment)

                /* Store the VEN as a variable on the graph object for easy access */
                this.graph.ven = venPseudoAssessment.nodeid

                /* Assess the start object */
                var startObjectRecord = {
                    objectReference: startObject,
                    stepsRemaining: this.config.maximumTraversalDepth,
                    traversalLevel: 0,
                    nodeid: this.getNewNodeID(),
                    firstpathChain: []
                };
                var startObjectAssessment = this.analyzeObject(startObjectRecord.objectReference);
                startObjectAssessment.traversalLevel = startObjectRecord.traversalLevel;
                this.graph.addNode(startObjectRecord.nodeid, startObjectAssessment)
                this.objectRegistry.set(startObjectRecord.objectReference, startObjectRecord.nodeid);

                /* Create the virtual entry edge */
                var veePseudoAssessment = this.PropertyAssessment(this.config.defaultValue)
                veePseudoAssessment.traversalLevel = 0
                veePseudoAssessment.isVEE = true;
                veePseudoAssessment.edgelabel = "VEE";
                veePseudoAssessment.firstpath = "VEE";
                veePseudoAssessment.traversaltype = "VEE";

                this.graph.addEdge(venPseudoAssessment.nodeid, startObjectRecord.nodeid, "VEE", veePseudoAssessment)

                /* Store the VEE as a variable on the graph object for easy access */
                this.graph.vee = [venPseudoAssessment.nodeid, startObjectRecord.nodeid, "VEE"]


                /* Queue the start node */
                this.objectQueue.push(startObjectRecord);

                /* This function sends a beacon to the server in order to tell it thats it's alive */
                var send_beacon = function () {
                    try {
                        http = new XMLHttpRequest();
                        url = this.config.beaconURL + "?uuid=" + this.config.graph_uuid;
                        http.open("GET", url, true);
                        http.send();
                    } catch (err) { }
                }
                try {
                    if (typeof (this.config.beaconURL) == "string" && this.config.beaconURL != "") {
                        setInterval(send_beacon, 2000);
                    }
                } catch (err) { this.log.warn("crawler", "Error with beacon") }

                /* Store a string representation of the configuration in the graph metadata. */
                for (var key in this.config) {
                    if (typeof (this.config[key]) != "function") {
                        var stringified = "";
                        try {
                            stringified = String(this.config[key])
                        }
                        catch (err) {
                            this.log.error("crawler", "crawler config could not be stringfied " + err);
                            this.log.error("crawler", err);
                            return null
                        } this.graph.metadata[key] = stringified;
                    }
                }

                /* Also store the caching results in the graph metadata */
                for (var key in this.cachedFeatureChecks) {
                    this.graph.metadata[key] = this.cachedFeatureChecks[key]
                }

                /* Execute the onNode callback for the entrypoint */
                if (typeof (this.config.onNode) == "function") {
                    try {
                        this.config.onNode(startObjectRecord, venPseudoAssessment, veePseudoAssessment)
                    }
                    catch (err) {
                        this.log.warn("crawler", "onNode callback threw an error " + err);
                        this.log.warn("crawler", err);
                    }
                }

                this.log.info("crawler", "Generation of Crawler() object has finished.")
            }
            ,

            /* Crawl asynchronously starting at provided object, returns the graph */
            crawlAsync: function (startObject, localConfig, graphToStoreCrawlingResult, onNode, onEdge) {

                var crawler = this;
                try {
                    if (crawler.isTheCrawler != "yes i'm the crawler") { throw "Expected 'this' to be the crawler, but it isn't!" }
                }
                catch (err) {
                    this.log.crit("crawler.crawlAsync", "Expected 'this' to be the crawler, but it isn't! " + err);
                    this.log.crit("crawler.crawlAsync", err);
                    return;
                } crawler.init(startObject, localConfig, graphToStoreCrawlingResult)
                crawler.graph = graphToStoreCrawlingResult || crawler.graph
                crawler.log.progress("crawler", "Starting asynchronous crawling.");
                return crawler.util.Promise(function (resolve, reject) {

                    crawler.onNode = onNode
                    crawler.onEdge = onEdge
                    var async_step = function () {

                        if (crawler.graph.writeBlocked) {
                            console.log("crawler is paused, idling")
                            crawler.util.setTimeout(async_step, 250);
                            return;
                        }
                        var currentNumberOfObjects = 0;
                        var currentStepBatchStartingTime = 0;
                        try {
                            currentStepBatchStartingTime = Date.now();
                        } catch (err) {
                            /* If we do not have a time measurement functionality, only do one single object at a time. */
                            currentNumberOfObjects = crawler.config.asyncMaxObjectsPerStep - 1;
                        }
                        /* Limit the amount of javascript objects that are analyzed synchronously. */
                        while (currentNumberOfObjects < crawler.config.asyncMaxObjectsPerStep && !crawler.hasFinished) {
                            try {
                                /* If this function call has already taken the threshold amount of time, end it and set a timeout. */
                                if ((Date.now() - currentStepBatchStartingTime) > crawler.config.asyncMaxDurationPerStep) break;
                            } catch (err) { }
                            currentNumberOfObjects += 1;

                            try {
                                crawler.step()
                            } catch (err) {
                                crawler.log.crit("crawler", "Crawling ended because: " + String(err))
                                crawler.hasFinished = true;
                                reject(err)
                                return;
                            }
                        }
                        if (crawler.hasFinished) {
                            crawler.graph.metadata.number_of_nodes = crawler.graph.numberOfNodes
                            crawler.graph.metadata.number_of_edges = crawler.graph.numberOfEdges
                            crawler.graph.visitedObjects = crawler.objectRegistry
                            crawler.log.progress("crawler", "End of crawling.");
                            crawler.log.progress("crawler", "Crawler generated a graph with N=" + crawler.graph.numberOfNodes + ", E=" + crawler.graph.numberOfEdges);
                            resolve(crawler.graph)
                        } else {
                            crawler.util.setTimeout(async_step)
                        }

                    };
                    crawler.util.setTimeout(async_step)
                })
            }

            ,

            /* Crawl synchronously starting at provided object, returns the graph */
            crawlSync: function (startObject, localConfig, graphToStoreCrawlingResult, onNode, onEdge) {
                var crawler = this;
                try {
                    if (crawler.isTheCrawler != "yes i'm the crawler") { throw "Expected 'this' to be the crawler, but it isn't!" }
                }
                catch (err) {
                    this.log.crit("crawler.crawlAsync", "Expected 'this' to be the crawler, but it isn't! " + err);
                    this.log.crit("crawler.crawlAsync", err);
                    return;
                } crawler.init(startObject, localConfig, graphToStoreCrawlingResult)

                crawler.log.progress("crawler", "Starting synchronous crawling.");
                crawler.onNode = onNode
                crawler.onEdge = onEdge
                while (!crawler.hasFinished) {
                    crawler.step()
                }
                crawler.graph.metadata.number_of_nodes = crawler.graph.numberOfNodes
                crawler.graph.metadata.number_of_edges = crawler.graph.numberOfEdges
                crawler.graph.visitedObjects = crawler.objectRegistry
                crawler.log.progress("crawler", "End of crawling.");
                crawler.log.progress("crawler", "Crawler generated a graph with N=" + crawler.graph.numberOfNodes + ", E=" + crawler.graph.numberOfEdges);
                return crawler.graph
            }
            ,

            /* Add all event listeners to all reachable objects */
            deepRegisterEventCatchall: function (objectref) {
                var listOfEventNames = [
                    // "click",
                    "offline",
                    "blur",
                    "canplay",
                    "abort",
                    "afterprint",
                    "beforeprint",
                    "beforeonload",
                    "canplaythrough",
                    "contextmenu",
                    // "change",
                    "dblclick",
                    "dragover",
                    "dragleave",
                    "dragenter",
                    "dragend",
                    "drag",
                    "ended",
                    "emptied",
                    "durationchange",
                    "dragstart",
                    "drop",
                    "error",
                    "formchange",
                    "focus",
                    "forminput",
                    "invalid",
                    "input",
                    "haschange",
                    "keypress",
                    "keydown",
                    "loadeddata",
                    "keyup",
                    //  "mouseout",
                    //  "mousedown",
                    //  "mousemove",
                    "message",
                    "loadstart",
                    "mouseup",
                    "playing",
                    //  "mousewheel",
                    "oine",
                    "pagehide",
                    "pageshow",
                    "pause",
                    "play",
                    "popstate",
                    "ratechange",
                    "progress",
                    "readystatechange",
                    "storage",
                    "stalled",
                    "seeking",
                    "scroll",
                    "seeked",
                    "resize",
                    "redo",
                    "suspend",
                    "undo",
                    "waiting",
                    "timeupdate",
                    "volumechange",
                    "cached",
                    "checking",
                    "downloading",
                    "noupdate",
                    "obsolete",
                    "updateready",
                    "statechange",
                    "chargingchange",
                    "chargingtimechange",
                    "dischargingtimechange",
                    "levelchange",
                    "autocomplete",
                    "autocompleteerror",
                    "beforecopy",
                    "beforecut",
                    "beforepaste",
                    "cancel",
                    "close",
                    "copy",
                    "cuechange",
                    "cut",
                    "load",
                    "loadedmetadata",
                    //  "mouseenter",
                    //  "mouseleave",
                    //  "mouseover",
                    "paste",
                    "pointerlockchange",
                    "pointerlockerror",
                    "reset",
                    "search",
                    "select",
                    "selectionchange",
                    "selectstart",
                    "show",
                    "submit",
                    "toggle",
                    "webkitfullscreenchange",
                    "webkitfullscreenerror",
                    //  "wheel",
                    "open",
                    "loadend",
                    "beforeunload",
                    "hashchange",
                    "languagechange",
                    "line",
                    "rejectionhandled",
                    // "unhandledrejection",
                    "unload",
                    "encrypted",
                    "versionchange",
                    "blocked",
                    "upgradeneeded",
                    "success",
                    "complete",
                    "dataavailable",
                    "resume",
                    "start",
                    "stop",
                    "mute",
                    "unmute",
                    "midimessage",
                    "resourcetimingbufferfull",
                    "webkitresourcetimingbufferfull",
                    "connectionavailable",
                    "audioprocess",
                    "controllerchange",
                    "updatefound",
                    "boundary",
                    "end",
                    "mark",
                    "begin",
                    "repeat",
                    "enter",
                    "exit",
                    "addtrack",
                    "removetrack",
                    "active",
                    "inactive",
                    "addstream",
                    "datachannel",
                    "icecandidate",
                    "iceconnectionstatechange",
                    "negotiationneeded",
                    "removestream",
                    "signalingstatechange",
                    "audioend",
                    "audiostart",
                    "nomatch",
                    "result",
                    "soundend",
                    "soundstart",
                    "speechend",
                    "speechstart",
                    "animationend",
                    "animationiteration",
                    "animationstart",
                    "devicemotion",
                    // "deviceorientation",
                    "transitionend",
                    "webkitanimationend",
                    "webkitanimationiteration",
                    "webkitanimationstart",
                    "webkittransitionend",
                    "timeout",
                    "connect",
                    "terminate",
                    "deviceorientationabsolute",
                    "sourceclose",
                    "sourceended",
                    "sourceopen",
                    "update",
                    "updateend",
                    "updatestart",
                    "addsourcebuffer",
                    "removesourcebuffer",
                    "auxclick",
                    "pointercancel",
                    //  "pointerdown",
                    //  "pointerenter",
                    //  "pointerleave",
                    //  "pointermove",
                    //  "pointerout",
                    //  "pointerover",
                    //  "pointerup",
                    "gotpointercapture",
                    "lostpointercapture",
                    "waitingforkey",
                    "keystatuseschange",
                    "gattserverdisconnected",
                    "characteristicvaluechanged",
                    "connecting",
                    "disconnect",
                    "bufferedamountlow",
                    // "devicechange",
                    "icegatheringstatechange",
                    "messageerror",
                    "shippingaddresschange",
                    "shippingoptionchange",
                    "appinstalled",
                    "beforeinstallprompt",
                    "visibilitychange",
                    "track",
                    "tonechange",
                    "processorerror",
                    "freeze",
                    "enterpictureinpicture",
                    "leavepictureinpicture",
                    "fullscreenchange",
                    "fullscreenerror",
                    "connectionstatechange",
                    "finish",
                    "activate",
                    "beforeactivate",
                    "beforedeactivate",
                    "deactivate",
                    "mscontentzoom",
                    "msgesturechange",
                    "msgesturedoubletap",
                    "msgestureend",
                    "msgesturehold",
                    "msgesturestart",
                    "msgesturetap",
                    "msinertiastart",
                    "msmanipulationstatechanged",
                    "mssitemodejumplistitemremoved",
                    "msthumbnailclick",
                    "ariarequest",
                    "command",
                    "bounce",
                    "msneedkey",
                    "overconstrained",
                    "candidatewindowhide",
                    "candidatewindowshow",
                    "candidatewindowupdate",
                    "dtlsstatechange",
                    "localcandidate",
                    "candidatepairchange",
                    "icestatechange",
                    "ssrcconflict",
                    "msorientationchange",
                    "voiceschanged",
                    "focusin",
                    "focusout",
                    "zoom",
                    "compassneedscalibration",
                    "devicelight",
                    "vrdisplayactivate",
                    "vrdisplayblur",
                    "vrdisplayconnect",
                    "vrdisplaydeactivate",
                    "vrdisplaydisconnect",
                    "vrdisplayfocus",
                    "vrdisplaypointerrestricted",
                    "vrdisplaypointerunrestricted",
                    "vrdisplaypresentchange",
                    "msdecodercapacitychange",
                    "msdsh",
                    "msvideoreceivers",
                    "msquality",
                    "transitionstart",
                    "afterscriptexecute",
                    "beforescriptexecute",
                    "mozfullscreenchange",
                    "mozfullscreenerror",
                    "mozpointerlockchange",
                    "mozpointerlockerror",
                    "loading",
                    "loadingdone",
                    "loadingerror",
                    "warning",
                    "mozorientationchange",
                    "deviceproximity",
                    "userproximity",
                    "absolutedeviceorientation",
                    "install",
                    "sourceclosed",
                    "dragexit",
                    "transitioncancel",
                    "transitionrun",
                    "animationcancel",
                    "paymentauthorized",
                    "paymentmethodselected",
                    "shippingcontactselected",
                    "shippingmethodselected",
                    "validatemerchant",
                    "display",
                    "webkitkeyadded",
                    "webkitkeyerror",
                    "webkitkeymessage",
                    "compositionend",
                    "compositionstart",
                    "compositionupdate",
                    "domactivate",
                    "domattributenamechanged",
                    "domattrmodified",
                    "domcharacterdatamodified",
                    "domcontentloaded",
                    "domelementnamechanged",
                    "domfocusin",
                    "domfocusout",
                    "domnodeinserted",
                    "domnodeinsertedintodocument",
                    "domnoderemoved",
                    "domnoderemovedfromdocument",
                    "domsubtreemodified",
                    "gamepadconnected",
                    "gamepaddisconnected",
                    "die",
                    "orientationchange",
                    "svgabort",
                    "svgerror",
                    "svgload",
                    "svgresize",
                    "svgscroll",
                    "svgunload",
                    "svgzoom",
                    "touchcancel",
                    "touchend",
                    "touchenter",
                    "touchleave",
                    "touchmove",
                    "touchstart",
                    "cardstatechange",
                    "connectioninfoupdate",
                    "cfstatechange",
                    "datachange",
                    "dataerror",
                    "dommousescroll",
                    "dragdrop",
                    "draggesture",
                    "icccardlockerror",
                    "iccinfochange",
                    "localized",
                    "mozaudioavailable",
                    "mozbeforeresize",
                    "mozbrowserclose",
                    "mozbrowsercontextmenu",
                    "mozbrowsererror",
                    "mozbrowsericonchange",
                    "mozbrowserlocationchange",
                    "mozbrowserloadend",
                    "mozbrowserloadstart",
                    "mozbrowseropenwindow",
                    "mozbrowsersecuritychange",
                    "mozbrowsershowmodalprompt",
                    "mozbrowsertitlechange",
                    "mozgamepadbuttondown",
                    "mozgamepadbuttonup",
                    "mozmousepixelscroll",
                    "mozorientation",
                    "mozscrolledareachanged",
                    "moztimechange",
                    "moztouchdown",
                    "moztouchmove",
                    "moztouchup",
                    "alerting",
                    "busy",
                    "callschanged",
                    "connected",
                    "delivered",
                    "dialing",
                    "disabled",
                    "disconnected",
                    "disconnecting",
                    "enabled",
                    "held",
                    "holding",
                    "incoming",
                    "received",
                    "resuming",
                    "sent",
                    "statuschange",
                    "overflow",
                    "smartcard-insert",
                    "smartcard-remove",
                    "stkcommand",
                    "stksessionend",
                    "text",
                    "underflow",
                    "uploadprogress",
                    "ussdreceived",
                    // "voicechange",
                    "securitypolicyviolation",
                    "animation",
                    "audioprocessing",
                    "blob",
                    "clipboard",
                    "composition",
                    "custom",
                    "fetch",
                    "formdata",
                    "gamepad",
                    "hidinputreport",
                    "idbversionchange",
                    "keyboard",
                    "mediastream",
                    "mouse",
                    "mutation",
                    "offlineaudiocompletion",
                    "pagetransition",
                    "paymentrequestupdate",
                    "pointer",
                    "rtcdatachannel",
                    "rtcpeerconnectionice",
                    "svg",
                    "time",
                    "touch",
                    "transition",
                    "ui",
                    "webglcontext",
                    "navigate",
                    "navigatesuccess",
                    "navigateerror",
                    "currententrychange"
                ]


                var makeEventListener = (srcObj, eventName) => {
                    return (event) => {
                        if (!srcObj["XSL_events"]) srcObj["XSL_events"] = {}
                        if (!srcObj["XSL_events"][eventName]) srcObj["XSL_events"][eventName] = []
                        // overwrite timeStamp
                        Object.defineProperty(event, 'timeStamp', {})
                        // add event so we can crawl it
                        srcObj["XSL_events"][eventName].push(event)
                        console.log(`[EventListener Module] triggered ${eventName} on ${srcObj}`)
                    }
                }

                var nodecb = (nodeRecord, nodeData, reachedViaPropertyData) => {
                    let eventReceiver = nodeRecord.objectReference
                    if (typeof eventReceiver == "object" && eventReceiver !== null && typeof eventReceiver.addEventListener == "function") {
                        for (let eventName of listOfEventNames)
                            eventReceiver.addEventListener(eventName, makeEventListener(eventReceiver, eventName))
                    }
                }
                console.log('[EventListener Module] Adding event listeners to all objects')
                return this.crawlAsync(objectref, {
                    onNode: nodecb, /* <-- relevant */
                    maximumTraversalDepth: 1000,
                    beaconURL: "",
                    stopBeforeObjects: [],
                    traversePrototypes: false,
                    objectAnalysisMethodSerializations: false,
                    skipUnreadables: true,
                    skipUndefined: true,
                    skipNonDeterministics: true,
                    skipHtmlAndTextProperties: true,
                    skipAboutBlankDOMs: false,
                    discoveryMethodIndexChar: false,
                    discoveryMethodSymbolUnscopables: true,
                    discoveryMethodNewEnumerator: true,
                    discoveryMethodGetPrototypeOf: false,
                })


  


            }
            ,

            /* The crawler takes one step further. Called in a loop/interval until the traversal is finished. */
            step: function () {

                var crawler = this;
                try {
                    if (crawler.isTheCrawler != "yes i'm the crawler") { throw "Expected 'this' to be the crawler, but it isn't!" }
                }
                catch (err) {
                    this.log.crit("crawler.step", "Expected 'this' to be the crawler, but it isn't! " + err);
                    this.log.crit("crawler.step", err);
                    return;
                }	/* If the crawler has finished, it is not allowed to continue. Return.*/
                if (crawler.hasFinished) {
                    return
                }

                /* If the queue is empty, it means we have traversed all that there is.
                The only possibility to get new entries in the queue is if it's done by third party code
                If you are capturing events, you will want the crawler to "idle" and queue events when they arise.  */
                if (crawler.objectQueue.length == 0) {
                    if (crawler.config.stopCrawlingUponEmptyQueue == true) {
                        crawler.graph.isFrozen = true;
                        crawler.hasFinished = true;
                    }
                    return;
                }

                /* We take a step -> Increment the number of steps taken */
                crawler.totalNumberOfSteps++;

                /* Step 1) Provide the next queued item, please! */
                try {
                    var currentObjectRecord = crawler.objectQueue.shift();
                }
                catch (err) {
                    this.log.debug("crawler", "Can't unqueue object record from queue! " + err);
                    this.log.debug("crawler", err);
                    return;
                } crawler.log.info("crawler", "Object no. " + crawler.totalNumberOfSteps + " (id " + currentObjectRecord.nodeid + ") via '" + currentObjectRecord.firstpathChain.join(".") + "'");
                crawler.log.info("crawler", "Queue size = " + crawler.objectQueue.length
                    + ", steps remaining = " + currentObjectRecord.stepsRemaining
                    + ", traversal level = " + currentObjectRecord.traversalLevel
                    + ", N = " + crawler.graph.numberOfNodes
                    + ", E = " + crawler.graph.numberOfEdges)


                /* Stop graph traversal at objects on the stop-list. Don't search for properties on them, skip immediately. */
                try {
                    var isStopObject = crawler.config.stopBeforeObjects.has(currentObjectRecord.objectReference)
                }
                catch (err) {
                    this.log.error("crawler", "Can't check whether the edge is in the ignore list! " + err);
                    this.log.error("crawler", err);
                    return;
                } if (isStopObject) {
                    crawler.log.info("crawler", "stopping at object because it is on the stop list");
                    return;
                }

                /* Step 2) What properties do we discover on the current object? */
                try {
                    var newProperties = crawler.discoverProperties(currentObjectRecord.objectReference).values();
                }
                catch (err) {
                    this.log.debug("crawler", "Uncaught error while discovering properties! " + err);
                    this.log.debug("crawler", err);
                    return;
                }	/* Loop through all discovered properties */

                try {
                    crawler.property = newProperties.next().value;
                }
                catch (err) {
                    this.log.error("crawler", "Can't pop a property from the list of discovery " + err);
                    this.log.error("crawler", err);
                    return;
                } var safetyCounter = 0;
                while (safetyCounter++ < 10000) {

                    try {
                        crawler.property = newProperties.next().value;
                    }
                    catch (err) {
                        this.log.error("crawler", "Can't pop a property from the list of discovery " + err);
                        this.log.error("crawler", err);
                        return;
                    } if (crawler.property === undefined) {
                        break;
                    }

                    if (crawler.config.debugStepwise) {
                        util.alert("Stepwise debugging: continue for next property")
                    }

                    /*
                        crawler.property.identifier can either be a symbol or an string, following the standard. But there were cases where it was an object!
                        Therefore, we don't make many assumptions.
                    */

                    /* Ignore Properties: If the property identifies is in the ignore-list, well, ignore it. Don't touch the target node. */
                    try {
                        var isIgnoreProperty = crawler.config.stopBeforeProperties.has(crawler.property.identifier)
                    }
                    catch (err) {
                        this.log.crit("crawler", "Can't check whether the edge is in the ignore list! " + err);
                        this.log.crit("crawler", err);
                        return
                    } if (isIgnoreProperty) {
                        crawler.log.verbose("crawler", "ignoring blacklisted property before its assessment");
                        continue;
                    }

                    /* Step 3) Conduct the assessment. */
                    try {
                        var propertyResult = crawler.analyzeProperty(currentObjectRecord.objectReference, crawler.property);
                    }
                    catch (err) {
                        this.log.crit("crawler", "Uncaught error while analyzing a property! " + err);
                        this.log.crit("crawler", err);
                        return;
                    } var propertyAssessment = propertyResult.assessment;

                    try {
                        var isNoise = propertyResult.objectReference === undefined && crawler.property.options.skipIfUndefined === true;
                    }
                    catch (err) {
                        this.log.crit("crawler", "Could check is property is noise! " + err);
                        this.log.crit("crawler", err);
                        return;
                    } if (isNoise) {
                        crawler.log.verbose("crawler", "Skipping '" + propertyAssessment.edgelabel + "' is because it's noise")
                        continue;
                    }
                    crawler.log.verbose("crawler", "Property '" + propertyAssessment.edgelabel + "'")


                    /*
                        After the property assessment, we have a reference to the object behind the property.
                        We don't know what it is, so this happens with great care! It might be a filthy cross-origin object, an "unknown" stupidity or the like.
                    */

                    /* Update the firstpath edge attributes with the parameters of this function call */
                    propertyAssessment.firstpath = currentObjectRecord.firstpathChain.concat([propertyAssessment.edgelabel]).join(".")
                    propertyAssessment.firstpathBracket = "[\"" + currentObjectRecord.firstpathChain.concat([propertyAssessment.edgelabel]).join("\"][\"") + "\"]"

                    /* Ignore Objects: Skip objects on the ignore-list without adding them to the graph*/
                    try {
                        var isIgnoreObject = crawler.config.stopBeforeObjects.has(propertyResult.objectReference);
                    }
                    catch (err) {
                        this.log.warn("crawler", "Can't check whether the object is on the ignore-list! " + err);
                        this.log.warn("crawler", err);
                        continue;
                    } if (isIgnoreObject) {
                        crawler.log.verbose("crawler", "ignoring property to blacklisted object");
                        continue;
                    }

                    /* Step 4a) Conduct the assessment of the object */
                    try {
                        var objectAssessment = crawler.analyzeObject(propertyResult.objectReference);
                    }
                    catch (err) {
                        this.log.warn("crawler", "Uncaught error while analyzing test subject! " + err);
                        this.log.warn("crawler", err);
                        return;
                    }		/* Step 4b) Detect loops by checking whether the object is already in the registry.
             Checking for identity only works for certain types, like object and function, but not for primitives, like number.
             Numbers' identity always is equivalency, i.e. 1===1 even if the first and second '1' are different heap objects.
            */
                    var neighborObjectRecord = {
                        objectReference: propertyResult.objectReference,
                        stepsRemaining: currentObjectRecord.stepsRemaining - 1,
                        traversalLevel: currentObjectRecord.traversalLevel + 1,
                        nodeid: -1,
                        firstpathChain: currentObjectRecord.firstpathChain.concat([propertyAssessment.edgelabel]),
                        queueForTraversal: true
                    }
                    neighborObjectRecord.objectReference = propertyResult.objectReference;

                    /* Check whether it is possible to evaluate the identity of the property/object. Only then it makes sense to look it up in the registry. */
                    if (propertyAssessment.isReadable === true
                        && propertyAssessment.isDeterministic === true
                        && objectAssessment.isPrimitive === false
                    ) {

                        /* Try to find the object in the object registry */
                        try {
                            var existingNodeID = crawler.objectRegistry.get(neighborObjectRecord.objectReference)
                        }
                        catch (err) {
                            this.log.crit("crawler", "Cant' search the objectRegistry " + err);
                            this.log.crit("crawler", err);
                            return
                        }			/* Is this a known node? */
                        if (existingNodeID != undefined) {

                            /* The node already exists in the graph. Use that ID instead of creating a new one. */
                            neighborObjectRecord.nodeid = existingNodeID;

                            /* The node is already in the graph. No need to queue it for traversal. */
                            neighborObjectRecord.queueForTraversal = false;

                        }

                    }

                    /* Is wanted, skip props with "undefined" */
                    if ((objectAssessment.nodevalue === "undefined" && objectAssessment.nodetype === "undefined") && crawler.config.skipUndefined === true) {
                        crawler.log.verbose("crawler", "Skipping property because it points to undefined.")
                        continue;
                    }

                    /* Is wanted, skip unreadable objects */
                    if (propertyAssessment.isReadable !== true && crawler.config.skipUnreadables === true) {
                        crawler.log.verbose("crawler", "Skipping unreadable property.")
                        continue;
                    }

                    /* The property cannot be evaluated for identity. This could mean it is a number, or an erroneous property (e.g. cross origin).
                       Create a new ID. This means, even if the object is the same heap object it will be present as several nodes in the graph. */
                    if (neighborObjectRecord.nodeid === -1) {
                        neighborObjectRecord.nodeid = this.getNewNodeID();
                        /* Store the resulting assessment data in the graph */
                        crawler.graph.addNode(neighborObjectRecord.nodeid, objectAssessment)
                        objectAssessment.nodeid = neighborObjectRecord.nodeid
                        objectAssessment.traversalLevel = neighborObjectRecord.traversalLevel
                        crawler.objectRegistry.set(neighborObjectRecord.objectReference, neighborObjectRecord.nodeid)
                        if (typeof (crawler.config.onNode) == "function") {
                            try {
                                crawler.config.onNode(neighborObjectRecord, objectAssessment, propertyAssessment)
                            }
                            catch (err) {
                                this.log.warn("crawler", "onNode callback threw an error " + err);
                                this.log.warn("crawler", err);
                            }
                        }
                    } else {
                        /* This node has been traversed. */
                        neighborObjectRecord.queueForTraversal = false;
                    }


                    try {
                        propertyAssessment.isBlacklisted = crawler.config.stopAfterProperties.has(crawler.property.identifier)
                    }
                    catch (err) {
                        this.log.warn("crawler", "Can't check if blacklisted " + err);
                        this.log.warn("crawler", err);
                    }		/* Step 6) Decide whether the neighbor object is queued for traversal */
                    /* If the object meets the necessary requirements, queue it for further traversal. */

                    if (propertyAssessment.isReadable !== true
                        || (objectAssessment.isAboutBlankDOM === true && crawler.config.skipAboutBlankDOMs === true)
                        || (propertyAssessment.isDeterministic !== true && crawler.config.skipNonDeterministics === true)
                        || propertyAssessment.isBlacklisted !== false
                        || objectAssessment.isPrimitive !== false
                        || objectAssessment.nodetype == "object" && objectAssessment.nodevalue === null
                        || objectAssessment.nodetype == "function"
                        || neighborObjectRecord.stepsRemaining <= 0
                        || propertyResult.assessment.isTargetPrototypeOfSource && !crawler.config.traversePrototypes) {

                        neighborObjectRecord.queueForTraversal = false
                        crawler.log.debug("crawler", "ignoring property because it is unsuitable for traversal:\n" +
                            "read: \t" + String(propertyAssessment.isReadable !== true) + "\n" +
                            "ndet: \t" + String(propertyAssessment.isDeterministic !== true) + "\n" +
                            "blist:\t" + String(propertyAssessment.isBlacklisted !== false) + "\n" +
                            "prim: \t" + String(objectAssessment.isPrimitive !== false) + "\n" +
                            "null: \t" + String(objectAssessment.nodetype == "object" && objectAssessment.nodevalue === null) + "\n" +
                            "func: \t" + String(objectAssessment.nodetype == "function") + "\n" +
                            "end:  \t" + String(neighborObjectRecord.stepsRemaining <= 0) + "\n" +
                            "proto:\t" + String(propertyResult.assessment.isTargetPrototypeOfSource && !crawler.config.traversePrototypes)
                        );
                    }


                    /* After registering the node, we have a node id. Use it to store the property assessment as an edge in the graph. */
                    try {
                        crawler.graph.addEdge(currentObjectRecord.nodeid, neighborObjectRecord.nodeid, propertyAssessment.edgelabel, propertyAssessment);
                    }
                    catch (err) {
                        this.log.debug("crawler", "Can't put the edge into the graph! " + err);
                        this.log.debug("crawler", err);
                        continue
                    } if (typeof (crawler.config.onEdge) == "function") {
                        try {
                            crawler.config.onEdge(currentObjectRecord, neighborObjectRecord, propertyAssessment)
                        }
                        catch (err) {
                            this.log.warn("crawler", "onEdge callback threw an error " + err);
                            this.log.warn("crawler", err);
                        }
                    }


                    /* Also store the ids in the assessments */
                    propertyAssessment.sourceid = currentObjectRecord.nodeid
                    propertyAssessment.targetid = neighborObjectRecord.nodeid
                    propertyAssessment.traversalLevel = currentObjectRecord.traversalLevel



                    /* queue the object for traversal*/
                    if (neighborObjectRecord.queueForTraversal) {
                        crawler.objectQueue.push(neighborObjectRecord);
                    }

                    /*end of while loop */
                }
            }
            /* END OF FUNCTION 'step()' */
            ,

            /* Takes an object and discovers all properties on it, returns a list. */
            discoverProperties: function (objectReference) {

                var crawler = this;
                try {
                    if (crawler.isTheCrawler != "yes i'm the crawler") { throw "Expected 'this' to be the crawler, but it isn't!" }
                }
                catch (err) {
                    this.log.crit("crawler.discovery", "Expected 'this' to be the crawler, but it isn't! " + err);
                    this.log.crit("crawler.discovery", err);
                    return;
                } crawler.log.debug("crawler.discovery", "Begin to discover properties on an object.")

                var discoveredProperties = crawler.util.Map();
                var approximateNumberOfProperties = 0;
                var debugPropertySummaryMessage = "Properties for current object:\n"

                /* This function collects the properties with bracket-like access */
                var crawlerReference = this;
                var self = this;
                var queueBracketProperty = function (identifier, discoveryMethod, options) {

                    //@@try("crawler.discovery", "Error when queuing a property into the list of discovered ones: could not check whether it is a number.","")
                    if (typeof (identifier) === "number" && Number(String(identifier)) === identifier) { identifier = String(identifier) }

                    /* Filter non-sense Identifiers. Null and undefined most probably never is a key for properties. */
                    if (identifier === undefined || identifier === null) {
                        crawler.log.debug("crawler.discovery", "A property is undefined or null.")
                        return;
                    }

                    /* Ignore properties which are on the ignore-list */
                    if (crawlerReference.config.stopBeforeProperties.has(identifier)) {
                        crawler.log.debug("crawler.discovery", "Skipping blacklisted property")
                        return;
                    }

                    /* Crawl __proto__ properties only if enabled */
                    if (identifier === "__proto__" && crawler.config.traversePrototypes === false) {
                        crawler.log.debug("crawler.discovery", "Skipping property on the ignore-list.")
                        return;
                    }

                    /* Is the property already discovered? */
                    var alreadyPresent = discoveredProperties.get(identifier);
                    if (alreadyPresent !== undefined) {
                        /* Yes, already discovered. Only update the discovery method. */
                        alreadyPresent.discoveryMethods[discoveryMethod] = true;
                    } else {
                        /* New discovery */
                        var newEntry = {
                            identifier: identifier,
                            accessorMethodDescription: "property/bracket",
                            accessorFunction: function () { return objectReference[identifier] },
                            discoveryMethods: {},
                            options: options || {}
                        }
                        newEntry.discoveryMethods[discoveryMethod] = true;
                        discoveredProperties.set(identifier, newEntry)
                        approximateNumberOfProperties += 1;
                        if (crawler.config.logPropertySummaryPerObject) {
                            try { debugPropertySummaryMessage += String(identifier) + "," } catch (justDiscardError) { }
                        }
                    }

                }

                /* Queue the empty string as property, since you can do x[""] = 5 */
                queueBracketProperty("", "HISTORICAL", { skipIfUndefined: true });

                /* This reference will traverse upwards the prototype chain */
                var currentReference = objectReference;

                /* If this is false, the loop stops*/
                var isUppermostPrototypeReached = false;

                /* The safety counter will evade endless loops, e.g. if node.__proto__ == node. Shouldn't happen, but it's JS, so... */
                var safetyCounter = 100;

                /* The length of the prototype chain */
                var prototypeLevel = 0;

                while (safetyCounter-- > 0 && isUppermostPrototypeReached === false) {

                    crawler.log.debug("crawler.discovery", "Discovery on prototype level " + prototypeLevel)

                    /* Method 1 */
                    if (crawler.config.discoveryMethodForIn === true) {
                        try {
                            for (var identifier in objectReference) {
                                queueBracketProperty(identifier, "FORIN");
                            }
                        } catch (err) {
                            crawler.log.debug("crawler.discovery", "Property discovery error with method FORIN:");
                            crawler.log.debug("crawler.discovery", err);
                        }
                    }

                    /* Method Object.Entries: */
                    if (crawler.config.discoveryMethodEntries === true) {
                        if (crawler.cachedFeatureChecks.canUseEntries) {
                            try {
                                var objectentries = Object.entries(currentReference); /* Should give back an array of name-value-tuples */
                                for (var index = 0; index < objectentries.length; index++) {
                                    queueBracketProperty(objectentries[index][0], "ENTRIES"); /* get only the name, discard the value at index 1 */
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method 'Object.entries( currentReference )': ")
                                crawler.log.debug("crawler.discovery", err);
                            }
                        }
                    }

                    /* Method 2: */
                    if (crawler.config.discoveryMethodOwnPropertyNames === true) {
                        if (crawler.cachedFeatureChecks.canUseGetOwnPropertyNames) {
                            try {
                                var ownPropertyNames = Object.getOwnPropertyNames(currentReference); /* Should give back an array of names */
                                for (var index = 0; index < ownPropertyNames.length; index++) {
                                    queueBracketProperty(ownPropertyNames[index], "GOPN");
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method 'Object.getOwnPropertyNames( currentReference )': ")
                                crawler.log.debug("crawler.discovery", err);
                            }
                        }
                    }

                    /* Method 3: */
                    if (crawler.config.discoveryMethodOwnPropertySymbols === true) {
                        if (crawler.cachedFeatureChecks.canUseGetOwnPropertySymbols) {
                            try {
                                var ownPropertySymbols = Object.getOwnPropertySymbols(currentReference); /* Should give back an array of symbols */
                                for (var index = 0; index < ownPropertySymbols.length; index++) {
                                    queueBracketProperty(ownPropertySymbols[index], "GOPS");
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method 'Object.getOwnPropertyNames( currentReference )': ")
                                crawler.log.debug("crawler.discovery", err);
                            }
                        }
                    }

                    /* Method 3b: */
                    if (crawler.config.discoveryMethodKeys === true) {
                        try {
                            var descriptorNames = Object.keys(currentReference);
                            for (var index = 0; index < descriptorNames.length; index++) {
                                queueBracketProperty(descriptorNames[index], "OBJKEYS");
                            }
                        } catch (err) {
                            crawler.log.debug("crawler.discovery", "ERROR with method 'Object.keys(  currentReference );': ")
                            crawler.log.debug("crawler.discovery", err);
                        }
                    }

                    /* Method 4: */
                    if (crawler.config.discoveryMethodOwnPropertyDescriptors === true) {
                        if (crawler.cachedFeatureChecks.canUseGetOwnPropertyDescriptors) {
                            try {
                                var descriptorNames = Object.keys(Object.getOwnPropertyDescriptors(currentReference));
                                for (var index = 0; index < descriptorNames.length; index++) {
                                    queueBracketProperty(descriptorNames[index], "GOPD");
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method 'Object.keys( Object.getOwnPropertyDescriptors( currentReference ) );': ")
                                crawler.log.debug("crawler.discovery", err);
                            }
                        }
                    }

                    /* Traverse upwards in the prototype chain */
                    if (crawler.cachedFeatureChecks.canUseGetPrototypeOf) {
                        try {
                            currentReference = Object.getPrototypeOf(currentReference);
                            crawler.log.debug("crawler.discovery", "traversing upwards the prototype chain")
                            prototypeLevel += 1;
                            if (currentReference === null || currentReference === undefined)
                                isUppermostPrototypeReached = true;
                        } catch (err) {
                            isUppermostPrototypeReached = true;
                            crawler.log.debug("crawler.discovery", "reached end of prototype chain")
                        }
                    }
                }

                /* Method 5: */
                if (crawler.config.discoveryMethodKeysProperty === true) {
                    try {
                        if (objectReference.keys != undefined && typeof objectReference.keys == "function") {
                            var ownPropertyNames = objectReference.keys(); /* Should give back an array of names */
                            for (var index = 0; index < ownPropertyNames.length; index++) {
                                queueBracketProperty(ownPropertyNames[index], "KEYS");
                            }
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR with method 'objectReference.keys()': ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }

                /* Method 6: */
                if (crawler.config.discoveryMethodLengthProperty === true) {
                    try {
                        if (typeof objectReference.length == "number") {
                            for (var index = 0; index < objectReference.length; index++) {
                                queueBracketProperty(String(index), "ARRAY");
                            }
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR with method 'objectReference.length': ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }

                /* Method 7: */
                if (crawler.config.discoveryMethodReflectOwnKeys === true) {
                    try {
                        /* Check if ES6 Reflection is available */
                        if (typeof Reflect == "object" && Reflect != null) {
                            /* This is ES6 and might not be supported everywhere. */
                            var ownPropertyNames = Reflect.ownKeys(objectReference); /* Should give back an array of names */
                            for (var index = 0; index < ownPropertyNames.length; index++) {
                                var propertyName = ownPropertyNames[index]
                                queueBracketProperty(propertyName, "REFLECT");
                            }
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR with method 'Object.ownKeys( objectReference )': ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }

                /* Method 8: */
                /* Use a list of attribute names from previous crawlings and choose a selection.
                   Only take the ones that do not point to "undefined". */
                if (crawler.config.discoveryMethodHistoricals === true) {
                    var index = -1;
                    while (++index < crawler.config.historical.length) {
                        try {
                            var propertyName = crawler.config.historical[index];
                            if (propertyName != undefined && propertyName != null && propertyName != "") {
                                try {
                                    /* Access the property and check the content. Most of historical edges will be undefined. Ignore them.
                                     Note: this can trigger printPreview and the like. */
                                    if (objectReference[propertyName] === undefined) { continue; }
                                } catch (err) { }
                                /* We hit something that throws an error or is not undefined. Neat. */
                                queueBracketProperty(propertyName, "HISTORICAL", { skipIfUndefined: true });
                            }
                        } catch (err) {
                            crawler.log.debug("crawler.discovery", "ERROR with method historical edge labels: ")
                            crawler.log.debug("crawler.discovery", err);
                        }
                    }
                }

                /* Following methods are inspired from "hackability" */
                /* Method 9 */
                if (crawler.config.discoveryMethodClassGetMethods === true) {
                    try {
                        if (typeof objectReference.getClass === "function") {
                            var methods = objectReference.getClass().getMethods();
                            if (methods) {
                                for (i = 0; i < methods.length(); i++) {
                                    queueBracketProperty(methods[i].getName(), "GETCLASSGETMETHODS");
                                }
                            }
                        }

                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR with method getClass().getMethods(): ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }

                /* Method 10 */
                if (crawler.config.discoveryMethodClassGetFields === true) {
                    try {
                        if (typeof objectReference.getClass === "function") {
                            var fields = objectReference.getClass().getFields();
                            if (fields) {
                                for (i = 0; i < fields.length(); i++) {
                                    queueBracketProperty(fields[i].getName(), "GETCLASSGETFIELDS");
                                }
                            }
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR with method getClass().getFields(): ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }

                /* Method 11, from hackability */
                if (crawler.config.discoveryMethodIndexChar === true) {
                    try {
                        for (i = -10; i <= 0xff; i++) {
                            queueBracketProperty(i, "INDEXCHAR");
                            if (i > -1) {
                                queueBracketProperty(String.fromCharCode(i), "INDEXCHAR", { skipIfUndefined: true });
                            }
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR with method String.fromCharCode(i): ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }



                if (crawler.config.discoveryMethodSymbolUnscopables === true) {
                    try {
                        if (typeof (Symbol) != "undefined") {
                            try {
                                if (Array.prototype[Symbol.unscopables]) {
                                    var unscopables = Object.keys(Array.prototype[Symbol.unscopables])
                                    for (var index = 0; index < unscopables.length; index++) {
                                        queueBracketProperty(unscopables[index], "ARRAYUNSCOPABLES", { skipIfUndefined: true });
                                    }
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method Object.keys(Array.prototype[Symbol.unscopables]) ")
                                crawler.log.debug("crawler.discovery", err);
                            }

                            try {
                                if (Object.prototype[Symbol.unscopables]) {
                                    var unscopables = Object.keys(Object.prototype[Symbol.unscopables])
                                    for (var index = 0; index < unscopables.length; index++) {
                                        queueBracketProperty(unscopables[index], "OBJECTUNSCOPABLES", { skipIfUndefined: true });
                                    }
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method Object.keys(Object.prototype[Symbol.unscopables]) ")
                                crawler.log.debug("crawler.discovery", err);
                            }

                            try {
                                if (RegExp.prototype[Symbol.unscopables]) {
                                    var unscopables = Object.keys(RegExp.prototype[Symbol.unscopables])
                                    for (var index = 0; index < unscopables.length; index++) {
                                        queueBracketProperty(unscopables[index], "REGEXUNSCOPABLES", { skipIfUndefined: true });
                                    }
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method Object.keys(RegExp.prototype[Symbol.unscopables]) ")
                                crawler.log.debug("crawler.discovery", err);
                            }

                            try {
                                if (Number.prototype[Symbol.unscopables]) {
                                    var unscopables = Object.keys(Number.prototype[Symbol.unscopables])
                                    for (var index = 0; index < unscopables.length; index++) {
                                        queueBracketProperty(unscopables[index], "NUMBERUNSCOPABLES", { skipIfUndefined: true });
                                    }
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method Object.keys(Number.prototype[Symbol.unscopables]) ")
                                crawler.log.debug("crawler.discovery", err);
                            }

                            try {
                                if (Boolean.prototype[Symbol.unscopables]) {
                                    var unscopables = Object.keys(Boolean.prototype[Symbol.unscopables])
                                    for (var index = 0; index < unscopables.length; index++) {
                                        queueBracketProperty(unscopables[index], "BOOLEANUNSCOPABLES", { skipIfUndefined: true });
                                    }
                                }
                            } catch (err) {
                                crawler.log.debug("crawler.discovery", "ERROR with method Object.keys(Boolean.prototype[Symbol.unscopables]) ")
                                crawler.log.debug("crawler.discovery", err);
                            }
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR when checking wether Symbols exists: ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }

                /* Also hackability */
                if (crawler.config.discoveryMethodNewEnumerator === true) {
                    try {
                        if (typeof (Enumerator) != "undefined") {
                            try {
                                for (var i = new Enumerator(objectReference); !i.atEnd(); i.moveNext()) {
                                    try {
                                        var iObj = i.item();
                                        var str = iObj.nodeName || iObj.tagName || 'Unknown';
                                        if (str != 'Unknown') {
                                            queueBracketProperty(str, "WINDOWSENUMERATOR");
                                        }
                                    } catch (e) { }
                                }
                            } catch (e) { }
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR when checking for window.Enumerator: ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }


                /* Add the Prototype edge, if enabled */
                if (crawler.config.discoveryMethodGetPrototypeOf === true) {
                    if (crawler.config.traversePrototypes === true && crawler.cachedFeatureChecks.canUseGetPrototypeOf) {
                        discoveredProperties.set(Object.getPrototypeOf, {
                            identifier: Object.getPrototypeOf,
                            accessorMethodDescription: "prototype",
                            accessorFunction: function () { return Object.getPrototypeOf(objectReference) },
                            discoveryMethods: { "MANUAL": true },
                            options: {}
                        })
                    }
                }

                /* Method 12: obj.getEntries()  */
                if (crawler.config.discoveryMethodGetEntries === true) {
                    try {
                        if (typeof objectReference.getEntries == "function") {
                            discoveredProperties.set(objectReference.getEntries, {
                                identifier: objectReference.getEntries,
                                accessorMethodDescription: "function",
                                accessorFunction: function () { return objectReference.getEntries() },
                                discoveryMethods: { "MANUAL": true },
                                options: {}
                            })
                        }
                    } catch (err) {
                        crawler.log.debug("crawler.discovery", "ERROR with method objectReference.getEntries(): ")
                        crawler.log.debug("crawler.discovery", err);
                    }
                }


                /* Add the list of property descriptors (getters, setters, values) */
                if (crawler.config.discoveryMethodOwnPropertyDescriptorsObject === true) {
                    if (crawler.cachedFeatureChecks.canUseGetOwnPropertyDescriptors) {
                        discoveredProperties.set(Object.getOwnPropertyDescriptors, {
                            identifier: Object.getOwnPropertyDescriptors,
                            accessorMethodDescription: "propertydescriptors",
                            accessorFunction: function () { return Object.getOwnPropertyDescriptors(objectReference) },
                            discoveryMethods: { "MANUAL": true },
                            options: {}
                        })
                    }
                }

                crawler.log.debug("crawler.discovery", "Ending discovery for current object, found " + approximateNumberOfProperties + " properties")
                if (crawler.config.logPropertySummaryPerObject) {
                    crawler.log.debug("crawler.discovery", debugPropertySummaryMessage)
                }

                return discoveredProperties;
            }
            ,

            /* Analyzes a property. Returns an PropertyAssessment. */
            analyzeProperty: function (sourceObjectReference, propertyToAnalyze) {

                var crawler = this;
                try {
                    if (crawler.isTheCrawler != "yes i'm the crawler") { throw "Expected 'this' to be the crawler, but it isn't!" }
                }
                catch (err) {
                    this.log.crit("crawler.analysis", "Expected 'this' to be the crawler, but it isn't! " + err);
                    this.log.crit("crawler.analysis", err);
                    return;
                } crawler.log.debug("crawler.analysis", "Begin to analyze a property")
                /* Storing the analysis results here */
                var propertyAssessment = crawler.PropertyAssessment()



                /* Try to access the property. This step may fail often, e.g. because of SOP */
                var objectReference = undefined;

                /* Turn the identifier (usually String or Symbol) into an edge label*/
                if (crawler.cachedFeatureChecks.canUseGetPrototypeOf && propertyToAnalyze.identifier === Object.getPrototypeOf) {
                    propertyAssessment.edgelabel = "(prototype)"
                } else if (crawler.cachedFeatureChecks.canUseGetOwnPropertyDescriptors && propertyToAnalyze.identifier === Object.getOwnPropertyDescriptors) {
                    propertyAssessment.edgelabel = "(descriptors)"
                } else if (typeof propertyToAnalyze.identifier === "function" && typeof propertyToAnalyze.identifier.name === "string" && propertyToAnalyze.identifier.name != "") {
                    propertyAssessment.edgelabel = propertyToAnalyze.identifier.name + "()"
                } else {
                    try {
                        propertyAssessment.edgelabel = String(propertyToAnalyze.identifier)
                    } catch (edgelabelToStringFailedError) {
                        crawler.log.error("crawler.analysis.property", "Problem when turning an identifier into a string:")
                        crawler.log.error("crawler.analysis.property", edgelabelToStringFailedError)
                        crawler.log.error("crawler.analysis.property", propertyToAnalyze)
                        try {
                            propertyAssessment.edgelabel = "" + edgelabelToStringFailedError.name + ": " + edgelabelToStringFailedError.message;
                        } catch (errorToStringFailedError) {
                            try {
                                propertyAssessment.edgelabel = String(errorToStringFailedError)
                            } catch (justIgnoreTheError) {
                                propertyAssessment.edgelabel = "(critical error: domparator could not generate an edge label)"
                            }
                        }
                    }
                }
                if (propertyAssessment.edgelabel === "") { propertyAssessment.edgelabel = "(empty string)" }

                /* Store how the edge was traversed (e.g. property or getPrototypeOf)*/
                propertyAssessment.traversaltype = propertyToAnalyze.accessorMethodDescription;


                /* Measure the time */
                var readingStartTime = Date.now();

                try {
                    /* Execute the accessor-Function. This gives us a reference to the object. */
                    objectReference = propertyToAnalyze.accessorFunction(); /* Can fail. E.g. access violation, syntax / semantics errors etc. */

                    /* Stop the time and store it */
                    propertyAssessment.readTime = Date.now() - readingStartTime;

                    /* Since there is no error: the property is readable */
                    propertyAssessment.isReadable = true;

                } catch (err) {

                    /* Stop the time and store it */
                    propertyAssessment.readTime = Date.now() - readingStartTime;

                    /* Oh no! An error! The property is not readable apparently. */
                    propertyAssessment.isReadable = false;

                    /* Maybe the error message is interesting. Better store it. */
                    propertyAssessment.readErrorMessage = "" + err.name + ": " + err.message;

                    crawler.log.debug("crawler.analysis.property", "Executing accessor function raises error:")
                    crawler.log.debug("crawler.analysis.property", err)

                }

                try {
                    propertyAssessment.discoveredVia = JSON.stringify(propertyToAnalyze.discoveryMethods)
                }
                catch (err) {
                    this.log.warn("crawler.analysis", "could not copy discovery methods into assessment " + err);
                    this.log.warn("crawler.analysis", err);
                } if (propertyAssessment.isReadable === true) {

                    /* Is the edge equal to itself using === ? */
                    try {
                        propertyAssessment.isSelfEqualTripleEqual = (propertyToAnalyze.accessorFunction() === propertyToAnalyze.accessorFunction());
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking propertyToAnalyze.accessorFunction() === propertyToAnalyze.accessorFunction() " + err);
                        this.log.debug("crawler.analysis", err);
                    } try {
                        propertyAssessment.isReferenceSelfEqualTripleEqual = (objectReference === objectReference);
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking objectReference === objectReference " + err);
                        this.log.debug("crawler.analysis", err);
                    }		/* Is the edge equal to itself using Object.is ? */
                    if (crawler.cachedFeatureChecks.canUseObjectIs) {
                        try {
                            propertyAssessment.isSelfEqualObjectIs = Object.is(propertyToAnalyze.accessorFunction(), propertyToAnalyze.accessorFunction());
                        }
                        catch (err) {
                            this.log.debug("crawler.analysis", "Error when checking Object.is( propertyToAnalyze.accessorFunction(), propertyToAnalyze.accessorFunction() ) " + err);
                            this.log.debug("crawler.analysis", err);
                        } try {
                            propertyAssessment.isReferenceSelfEqualObjectIs = Object.is(objectReference, objectReference);
                        }
                        catch (err) {
                            this.log.debug("crawler.analysis", "Error when checking Object.is( objectReference, objectReference ) " + err);
                            this.log.debug("crawler.analysis", err);
                        }
                    }

                    /* Try to get the property descriptor. If available, store the information. */
                    if (crawler.cachedFeatureChecks.canUseGetOwnPropertyDescriptor) {
                        try {
                            var propertyDescriptor = Object.getOwnPropertyDescriptor(objectReference, propertyToAnalyze.identifier)
                            if (propertyDescriptor != undefined) {
                                try {
                                    propertyAssessment.isConfigurable = String(propertyDescriptor.configurable)
                                }
                                catch (err) {
                                    this.log.debug("crawler.analysis", "Error when checking propertyDescriptor.configurable " + err);
                                    this.log.debug("crawler.analysis", err);
                                } try {
                                    propertyAssessment.isEnumerable = String(propertyDescriptor.enumerable)
                                }
                                catch (err) {
                                    this.log.debug("crawler.analysis", "Error when checking propertyDescriptor.enumerable " + err);
                                    this.log.debug("crawler.analysis", err);
                                } try {
                                    propertyAssessment.propertyDescriptorGet = String(propertyDescriptor.get)
                                }
                                catch (err) {
                                    this.log.debug("crawler.analysis", "Error when checking propertyDescriptor.get " + err);
                                    this.log.debug("crawler.analysis", err);
                                } try {
                                    propertyAssessment.propertyDescriptorSet = String(propertyDescriptor.set)
                                }
                                catch (err) {
                                    this.log.debug("crawler.analysis", "Error when checking propertyDescriptor.set " + err);
                                    this.log.debug("crawler.analysis", err);
                                } try {
                                    propertyAssessment.propertyDescriptorValue = String(propertyDescriptor.value)
                                }
                                catch (err) {
                                    this.log.debug("crawler.analysis", "Error when checking propertyDescriptor.value " + err);
                                    this.log.debug("crawler.analysis", err);
                                }
                            }
                        } catch (err) { }
                    }

                    /* The property is deterministic if both previous comparisons succeeded */
                    propertyAssessment.isDeterministic = propertyAssessment.isSelfEqualTripleEqual && ((!crawler.cachedFeatureChecks.canUseObjectIs) || propertyAssessment.isSelfEqualObjectIs);

                    /* Is the target thing the prototype of the source thing? */
                    try {
                        propertyAssessment.isTargetPrototypeOfSource = Object.isPrototypeOf.call(objectReference, sourceObjectReference);
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking Object.isPrototypeOf.call( objectReference, objectReference ) " + err);
                        this.log.debug("crawler.analysis", err);
                    }
                }
                return { assessment: propertyAssessment, objectReference: objectReference }
            }
            ,

            /* Analyzes a single object. Returns an ObjectAssessment. */
            analyzeObject: function (objectReference) {

                var crawler = this;
                try {
                    if (crawler.isTheCrawler != "yes i'm the crawler") { throw "Expected 'this' to be the crawler, but it isn't!" }
                }
                catch (err) {
                    this.log.crit("crawler.analysis", "Expected 'this' to be the crawler, but it isn't! " + err);
                    this.log.crit("crawler.analysis", err);
                    return;
                }	/* Storing the analysis results here */
                var objectAssessment = crawler.ObjectAssessment();

                try {
                    objectAssessment.nodetype = String(typeof objectReference);
                }
                catch (err) {
                    this.log.debug("crawler.analysis", "Could not determine the type of an object " + err);
                    this.log.debug("crawler.analysis", err);
                } crawler.primitiveTypes = crawler.primitiveTypes || crawler.util.Set(["boolean", "number", "string", "symbol"])
                try {
                    objectAssessment.isPrimitive = crawler.primitiveTypes.has(objectAssessment.nodetype) || (objectAssessment.nodetype == "number" && isNaN(objectReference)) || ((objectReference === undefined) && (typeof (objectReference) == "undefined") || (objectReference === null));
                }
                catch (err) {
                    this.log.debug("crawler.analysis", "Could not search the type in the list of primitive types " + err);
                    this.log.debug("crawler.analysis", err);
                }	/* uneval is a firefox-only serialization method */
                if (crawler.cachedFeatureChecks.canUseUneval) {
                    try {
                        objectAssessment.unevalResult = String(uneval(objectReference));
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Could not uneval an object " + err);
                        this.log.debug("crawler.analysis", err);
                    }
                }

                /* Try to find the "value" of the object. Name for functions, String(obj) for objects. */
                try {
                    if (objectAssessment.nodetype == "function") {
                        objectAssessment.nodevalue = String(objectReference.name); /* Can violate access rights */
                    } else {
                        objectAssessment.nodevalue = String(objectReference); /* Can violate access rights */
                    }
                    objectAssessment.isToStringSuccessful = true;
                } catch (err) {
                    objectAssessment.isToStringSuccessful = false;
                    objectAssessment.toStringErrorMessage = "" + err.name + ": " + err.message;
                }

                try {
                    objectAssessment.stringCoercionResult = String(objectReference); /* Can violate access rights */
                }
                catch (err) {
                    this.log.debug("crawler.analysis", "Error when checking String( objectReference ); " + err);
                    this.log.debug("crawler.analysis", err);
                } crawler.log.debug("crawler.analysis.objects", "Object analysis says type='" + objectAssessment.nodetype + "', value='" + objectAssessment.nodevalue + "'")

                if (crawler.config.objectAnalysisMethodSerializations) {
                    /* These serializations usually are time and memory consuming. Can be enabled for thoroughness, or disabled for performance. */

                    try {
                        objectAssessment.toStringResult = objectReference.toString(); /* Can violate access rights */
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking objectReference.toString(); " + err);
                        this.log.debug("crawler.analysis", err);
                    } try {
                        objectAssessment.toStringResultObject = Object.prototype.toString.call(objectReference); /* Can violate access rights */
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking Object.prototype.toString.call( objectReference ); " + err);
                        this.log.debug("crawler.analysis", err);
                    } try {
                        objectAssessment.toStringResultNumber = Number.prototype.toString.call(objectReference); /* Can violate access rights */
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking Number.prototype.toString.call( objectReference ); " + err);
                        this.log.debug("crawler.analysis", err);
                    } try {
                        objectAssessment.toStringResultBoolean = Boolean.prototype.toString.call(objectReference); /* Can violate access rights */
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking Boolean.prototype.toString.call( objectReference ); " + err);
                        this.log.debug("crawler.analysis", err);
                    } try {
                        objectAssessment.toStringResultFunction = Function.prototype.toString.call(objectReference); /* Can violate access rights */
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking Function.prototype.toString.call( objectReference ); " + err);
                        this.log.debug("crawler.analysis", err);
                    } try {
                        objectAssessment.toSourceResult = objectReference.toSource();
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking objectReference.toSource; " + err);
                        this.log.debug("crawler.analysis", err);
                    } try {
                        objectAssessment.toSourceResultObject = Object.prototype.toSource.call(objectReference);
                    }
                    catch (err) {
                        this.log.debug("crawler.analysis", "Error when checking Object.prototype.toSource.call( objectReference ); " + err);
                        this.log.debug("crawler.analysis", err);
                    }
                }

                try {
                    objectAssessment.isSealed = Object.isSealed(objectReference);
                }
                catch (err) {
                    this.log.debug("crawler.analysis", "Error when checking Object.isSealed( objectReference ) " + err);
                    this.log.debug("crawler.analysis", err);
                } try {
                    objectAssessment.isFrozen = Object.isFrozen(objectReference);
                }
                catch (err) {
                    this.log.debug("crawler.analysis", "Error when checking Object.isFrozen( objectReference ) " + err);
                    this.log.debug("crawler.analysis", err);
                } try {
                    objectAssessment.isExtensible = Object.isExtensible(objectReference);
                }
                catch (err) {
                    this.log.debug("crawler.analysis", "Error when checking Object.isExtensible( objectReference ) " + err);
                    this.log.debug("crawler.analysis", err);
                } objectAssessment.isAboutBlankDOM = false;
                /* This config will effect a stop after all same-origin Windows and Documents of about:blank pages.
                 This means that if the crawler encounters a same-origin Window or Document, it will check whether it is an about:blank-like page.
                 Use it you have a DOM with many about:blanks that you don't want to crawl.
            
                 Don't queue current neighbor if it
                    - Is instance of Window or of Document
                    - is same origin (ie no access error for the property accesses)
                    - has about:blank as .location.href. Here it comes in handy that both window and document have location objects.
                    - IS or HAS a document that has a head and body with no children
                 then the crawler will stop after the current object.
                */
                try {
                    var neighborDocument = null;
                    if (objectReference instanceof Window) {
                        neighborDocument = objectReference.document;
                    }
                    if (objectReference instanceof Document) {
                        neighborDocument = objectReference;
                    }
                    if (neighborDocument !== null
                        && neighborDocument.location.href == "about:blank"
                        && neighborDocument.body.children.length == 0
                        && neighborDocument.head.children.length == 0) {
                        objectAssessment.isAboutBlankDOM = true
                    }
                } catch (err) { /* it is expected to throw exceptions for any cross origin object */ }

                return objectAssessment
            }



            ,

            /* Contains info about the object, like value and type, various serializations, isFrozen, ... */
            ObjectAssessment: function () {
                return {
                    nodeid: this.config.defaultValue,
                    nodetype: this.config.defaultValue,
                    nodevalue: this.config.defaultValue,
                    unevalResult: this.config.defaultValue,
                    stringCoercionResult: this.config.defaultValue,
                    toStringResult: this.config.defaultValue,
                    toStringResultObject: this.config.defaultValue,
                    toStringResultNumber: this.config.defaultValue,
                    toStringResultBoolean: this.config.defaultValue,
                    toStringResultFunction: this.config.defaultValue,
                    toSourceResult: this.config.defaultValue,
                    toSourceResultObject: this.config.defaultValue,
                    isPropertyCreationSuccessful: this.config.defaultValue,
                    isPropertyDeletionSuccessful: this.config.defaultValue,
                    propertyCreationErrorMessage: this.config.defaultValue,
                    propertyDeletionErrorMessage: this.config.defaultValue,
                    isSealed: this.config.defaultValue,
                    isFrozen: this.config.defaultValue,
                    isExtensible: this.config.defaultValue,
                    isPrimitive: this.config.defaultValue,
                    isToStringSuccessful: this.config.defaultValue,
                    isAboutBlankDOM: this.config.defaultValue,
                    toStringErrorMessage: this.config.defaultValue,
                    graph_uuid: this.config.graph_uuid,
                    isVEN: "false"
                }
            }
            ,

            /* Contains info about the property, like if it's readable, thrown errors, if it's deterministic, ... */
            PropertyAssessment: function () {
                return {
                    sourceid: this.config.defaultValue,
                    targetid: this.config.defaultValue,
                    edgelabel: this.config.defaultValue,
                    /* 		edgetype							: this.config.defaultValue, // DEPRECATED */
                    traversaltype: this.config.defaultValue,
                    firstpath: this.config.defaultValue,
                    traversalLevel: this.config.defaultValue,
                    firstpathBracket: this.config.defaultValue,
                    symbolUUID: this.config.defaultValue,
                    discoveryMethod: this.config.defaultValue,
                    isBlacklisted: this.config.defaultValue,
                    isReadable: this.config.defaultValue,
                    isWritable: this.config.defaultValue,
                    isSelfEqualTripleEqual: this.config.defaultValue,
                    isSelfEqualObjectIs: this.config.defaultValue,
                    isReferenceSelfEqualObjectIs: this.config.defaultValue,
                    isReferenceSelfEqualTripleEqual: this.config.defaultValue,
                    isDeterministic: this.config.defaultValue,
                    isVisited: this.config.defaultValue,
                    isStopTraversal: this.config.defaultValue,
                    isTargetPrototypeOfSource: this.config.defaultValue,
                    readErrorMessage: this.config.defaultValue,
                    readTime: this.config.defaultValue,
                    graph_uuid: this.config.graph_uuid,
                    isVEE: "false"
                }
            }
            ,

            /* Constant used for checking if 'this' is the crawler object. */
            isTheCrawler: "yes i'm the crawler",

            /* The flag whether the crawler has finished */
            hasFinished: false,

            /* Used for the incremental IDs of nodes */
            internalIDCounter: 0,
            getNewNodeID: function () { return String(this.internalIDCounter++) },

            /* The total number of steps taken by the crawler */
            totalNumberOfSteps: 0,

            /* The traversal queue of objects */
            objectQueue: [],

            /* This Map maps javascript objects to their respective node ID in the graph,
             maps javascript object reference -> its node id in the graph. */
            objectRegistry: new Map(),

        }
        /* Monkeypatches during migration to module */
        newCrawler.log.config = newCrawler.config;

        return newCrawler
    }
    var c = Crawler();
    await c.deepRegisterEventCatchall(window)
    return 

})();