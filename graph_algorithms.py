import sys

import networkx
import networkx as nx
import requests
from collections import deque, defaultdict
from pprint import pprint, pformat


DEFAULT_COMPARISON_EDGE_ATTRIBUTES = [
"unevalResult",
#"stringCoercionResult",
#"toStringResult",
#"toStringResultObject",
#"toStringResultNumber",
#"toStringResultBoolean",
#"toStringResultFunction",
#"toSourceResult",
#"toSourceResultObject",
"isSealed",
"isFrozen",
"isExtensible",
"isPrimitive",
"isToStringSuccessful",
"isAboutBlankDOM",
"toStringErrorMessage",
]

DEFAULT_COMPARISON_NODE_ATTRIBUTES = [
"nodevalue",
"nodetype",
"readErrorMessage",
"isSelfEqualTripleEqual",
"isSelfEqualObjectIs",
"isReferenceSelfEqualObjectIs",
"isReferenceSelfEqualTripleEqual",
"isDeterministic",
#"readTime",
]


def urldecode( text ):
	return requests.utils.unquote(text) #.decode('utf8')

def is_wellformed_DEG( nxgraph ):
	try:
		assert_DEG_wellformity(nxgraph)
		return True
	except:
		return False


def assert_DEG_wellformity( nxgraph ):
	'''Returns whether the graph is a wellformed DEG. It must have a virtual entry node (VEN) and a virtual entry edge (VEE).
	The source of the VEE is the VEN. The target most often is a 'window' object, but not always.'''

	if int(nxgraph.graph['number_of_nodes']) != nxgraph.number_of_nodes():
		raise ValueError("The defragmented graph does not contain the number of nodes indicated by the JavaScript Crawler (expected: %s, actual: %d, diff: %d)."%(
			nxgraph.graph['number_of_nodes'], nxgraph.number_of_nodes(), int(nxgraph.graph['number_of_nodes']) - nxgraph.number_of_nodes()
		))
	if int(nxgraph.graph['number_of_edges']) != nxgraph.number_of_edges():
		raise ValueError("The defragmented graph does not contain the number of edges indicated by the JavaScript Crawler (expected: %s, actual: %d, diff: %d)."%(
			nxgraph.graph['number_of_edges'], nxgraph.number_of_edges(), int(nxgraph.graph['number_of_edges']) - nxgraph.number_of_edges()
		))


	######### Naming #########
	# Assert that all edges have the mandatory attributes
	for u,v,key,data in nxgraph.edges( data=True, keys=True ):
		for edge_attribute_name in ['edgelabel', 'firstpath', 'traversaltype', 'traversaltype']:
			if edge_attribute_name not in data:
				raise ValueError( "Edge (%s->%s, %s) of graph %s does not have the mandatory property '%s'\nData:\n%s" % ( u, v, key, nxgraph.name, edge_attribute_name, pformat(data) ) )
	for n,data in nxgraph.nodes( data=True ):
		for node_attribute_name in ['nodetype']:
			if node_attribute_name not in data:
				raise ValueError( "Node %s of graph %s does not have the mandatory property '%s'" % ( n, nxgraph.name, node_attribute_name ) )


	######### Structural correctness #########

	# Assert that all graphs have the virtual entry edge
	if not nxgraph.has_node('0'):
		raise ValueError("The virtual entry node (id=0) is missing")
	if len( nxgraph.out_edges('0') ) != 1:
		raise ValueError("The virtual entry edge is not present at node[id=0]")


	# Assert that all nodes are reachable from the virtual start node
	tree = nx.dfs_tree( nxgraph , '0')
	if set(tree.nodes()) != set(nxgraph.nodes()):
		raise ValueError("Graph %s does not have a spanning tree from the virtual start node!"%nxgraph.name)

	######### Semantical correctness of contained information #########

	# We do not allow dots in edge labels, because it confuses e.g. firstpaths.
	# Dots in edge labels are expected to be escaped.
	# Update: this has changed, e.g. edgelabel "Symbol(Symbol.unscopables)" has dots
#	labels = nx.get_edge_attributes(nxgraph,'edgelabel')
#	for e, l in labels.items():
#		if "." in l:
#			raise ValueError("Edge %s has an edge label that contains a '.' (dot): %s"%(e,l))

	# Edgelabels are unique in every out-star
	for n in nxgraph.nodes( ):
		outstar = nxgraph.out_edges( n, keys=True, data=True )
		labels = [ ( data['edgelabel'], data['traversaltype'] ) for _,_,_,data in outstar ]
		if len(set(labels)) != len(labels):
			message = "\n".join( [ " / ".join( [ data['edgelabel'], data['traversaltype'], data['firstpath'] ] ) for _,_,_,data in outstar if ( data['edgelabel'], data['traversaltype'] ) in labels ] )
			raise ValueError("The list of out-labels of node %s contains duplicates: \n %s"%(n, message) )

	# Assert that the 'firstpath' property is walkable in the graph
	# Currently deactivated: Not much benefit, time expensive
#	for u,v,key,data in nxgraph.edges( data=True, keys=True ):
#		firstpath = data['firstpath'].split(".")
#		endnode, steps = walk_path_by_edgelabels( nxgraph, '0', firstpath )
#		if endnode == None:
#			raise ValueError( "Graph %s: Edge %s->%s %s '%s' is not reachable by its firstpath %s and fails after %d steps"%(
#				nxgraph.name, u,v,key,data['edgelabel'], firstpath, steps) )


#############################################################################
# DEG Isomorphism
#############################################################################

def is_isomorphic_DEG( nxgraph_A, nxgraph_B, skip_copy=False ):

	'''Checks whether the two graphs are isomorphic (''the same''). If isomorphic, it will also return the mapping between the graphs.
	Isomorphism can only be proven by fining a mapping. Calculating this mapping can take very long.
	If the graphs are not isomorphic for obvious reasons, e.g. |V1|!=|V2|, it will return 'false' quickly.

	This variant is tailored to DEGs. It ignores several values which ALWAYS are different in two DEGs (which are not copies):
	 - time-variant values like time stamps
	 - pseudo random values like in navigator.performance
	 - the activiation boolean of the crawler.js
	 - VEN and VEE
	'''

	# copy the graphs, because we will write into them
	if not skip_copy:
		nxgraph_A, nxgraph_B = nxgraph_A.copy(), nxgraph_B.copy()

	# Only allow wellformed DEGs to be processed
	if not is_wellformed_DEG(nxgraph_A) or not is_wellformed_DEG(nxgraph_B):
		return False # not a DEG -> can't be DEG-isomorphic

	# Remove the VEN / VEE. It is irrelevant where in the DOM the crawler started.
	for G in [nxgraph_A, nxgraph_B]:
		ven = [ n for n,data in G.nodes( data=True ) if data["isVEN"] == "true" ][0]
		G.remove_node(ven) # Also removes V.E.E.

	success = nx.is_isomorphic(nxgraph_A, nxgraph_B, edge_match=_em, node_match=_nm)
	return success

def _em(e1,e2):
	'''Tests whether two DEG edges are isomorphic.'''

	if len(e1) != len(e2):
		# Number of parallel edges differs -> not a match
		return False

	isomorphism_edge_attribute_names = [
		'isBlacklisted', 'isReadable', 'isToStringSuccessful',
		'isSelfEqualTripleEqual', 'isSelfEqualObjectIs',
		'isReferenceSelfEqualObjectIs',
		'isReferenceSelfEqualTripleEqual', 'isDeterministic',
		'isPrimitive',
		'isSealed', 'isFrozen', 'isExtensible', 'isVEE',
		'readErrorMessage', 'toStringErrorMessage' ]

	vectors = []
	for edge in [e1, e2]:
		vectors.append({
			edge[parallel_edge]['edgelabel']: [
				edge[parallel_edge].get(fieldname, '') for fieldname in isomorphism_edge_attribute_names
			] for parallel_edge in edge
		})
	return vectors[0] == vectors[1]


def _nm(n1,n2):
	'''Tests whether two DEG nodes are equivalent.'''
	strings_to_be_replaced = [
		'hd_so_edextraction', 'hd_so_hdextraction',
		'ed_extraction', 'ed_blank',
		'var CONFIG_CRAWLER_ENABLED = false;',
		'var CONFIG_CRAWLER_ENABLED = true;']

	match = True
	match &= n1['nodetype'] == n2['nodetype']
	match &= n1['isVEN'] == n2['isVEN']
	if match:
		nodetype = n1['nodetype']
		v1, v2 = n1.get('nodevalue',''), n2.get('nodevalue','')
		if nodetype in [ 'string', 'object' ]:
			v1 = requests.utils.unquote(v1).decode('utf8')
			v2 = requests.utils.unquote(v2).decode('utf8')
			for replace_string in strings_to_be_replaced:
				v1 = v1.replace( replace_string, 'REPLACED' )
				v2 = v2.replace( replace_string, 'REPLACED' )
			match &= v1 == v2
		elif nodetype == 'number':
			v1f, v2f = float(v1), float(v2)
			if v1 == v2:
				match = True
			else:
				match &= v1f > 1000000000 and v2f > 1000000000
		else:
			match &= v1 == v2
	return match


#############################################################################
# Breadth-First Tree Subtraction
#############################################################################

# There are node and edge attributes which are always different between two runs of the crawler, even if the parameters are the same.
# For example, the order of traversal can differ. The graph uuid is unique.
# BFS_TREE_SUBTRACTION_BLACKLIST = [
# 	'firstpath', 'firstpathBracket', 'sourceid', 'targetid', 'isVisited', 'isStopTraversal',
# 	'discoveryMethod', 'symbolUUID', 'graph_uuid', 'readTime', 'nodeid', 'graph_uuid', 'discoveryMethod']
#
# BFS_TREE_SUBTRACTION_WHITELIST = [ 'edgelabel','edgetype', 'nodetype', 'nodevalue' ]
#
# def _norm(d):
# 	#return { k:v for k,v in d.items() if k not in BFS_TREE_SUBTRACTION_BLACKLIST }
# 	return { k:v for k,v in d.items() if k in BFS_TREE_SUBTRACTION_WHITELIST }
#
#
# def bfs_tree_subtraction_two( nxgraph_A, nxgraph_B, root_A_nodeid=None, root_B_nodeid=None ):
# 	'''Subtracts the provided graphs by using breadth-first tree traversal. Note: works in-place, thus changes the input graphs.
# 	Starting at the root of the DEG, it removes all the graph components that are the same until a differing component is reached.'''
# 	nodetuple_queue = deque()
#
# 	nxgraph_A, nxgraph_B = nxgraph_A.copy(), nxgraph_B.copy()
#
# 	venA = root_A_nodeid or getVEN( nxgraph_A )
# 	venB = root_B_nodeid or getVEN( nxgraph_B )
# 	nodetuple_queue.append( ( venA, venB ) )
#
# 	while len( nodetuple_queue ) != 0:
# 		sourceA, sourceB = nodetuple_queue.popleft()
# 		outedges1, outedges2 = list(nxgraph_A.out_edges( sourceA, data=True, keys=True )), list(nxgraph_B.out_edges( sourceB, data=True, keys=True ))
# 		for _, targetA, keyA, dataA in sorted( outedges1, key = lambda e: e[3]['edgelabel'] ):
# 			matching_outedges = [ e for e in outedges2 if e[3]['edgelabel'] == dataA['edgelabel'] and e[3]['edgetype'] == dataA['edgetype'] ]
# 			if not len( matching_outedges ) in [0,1] :
# 				pprint(matching_outedges)
# 				raise ValueError("The graph has two out-edges with the same edgelabel-edgetype tuple. There shouldn't be more than one.")
# 			if len( matching_outedges ) == 1:
# 				_, targetB, keyB, dataB = matching_outedges[0]
# 				if _norm(dataA) == _norm(dataB) and _norm(nxgraph_A.nodes[targetA]) == _norm(nxgraph_B.nodes[targetB]):
# 					# if match is found, queue targets and delete both edges.
# 					nxgraph_A.remove_edge( sourceA, targetA, keyA )
# 					nxgraph_B.remove_edge( sourceB, targetB, keyB )
# 					nodetuple_queue.append( ( targetA, targetB ) )
#
# 	for g in nxgraph_A, nxgraph_B:
# 		nodes_with_degree_zero = [ n for n in g.nodes() if g.degree(n) == 0 ]
# 		g.remove_nodes_from( nodes_with_degree_zero )

def bfs_tree_subtraction( graphs, roots=None):
	graphs = [ g.copy() for g in graphs ]
	bfs_tree_subtraction_inplace( graphs, roots=None )
	return graphs

def bfs_tree_subtraction_inplace( graphs, roots=None, edge_match_attributes = ["edgelabel"], node_match_attributes = ["nodevalue", "nodetype"], continue_after_divergence=False ):
	'''A BFS that runs synchronously on a list of graphs.
	It only traverses paths that exist in all graphs.
	Traversed paths are then deleted from the graphs.
	If :roots isnt given, it takes the VENs.

	:edge_match_attributes is the list of edge attributes whose values must be identical in order to remove an edge.
	:node_match_attributes is the list of node attributes whose values must be identical in order to remove a node.
	'''

	if not roots:
		roots = [ getVEN(g) for g in graphs]

	assert( type(graphs) == type(roots) == list )
	assert( len(graphs) == len(roots) )


	current_position = roots
	current_path = ""
	queue = deque()
	visited_positions = set() 
	divergence_roots = []

	while current_position:

		# the neighborhoods, the "out-stars", for the current positions in all graphs.
		outstars = [ list(g.out_edges( n, keys=True )) for g, n in zip(graphs,current_position) ]

		# union the labels of the edges in alll out-stars
		all_edgelabels = set([ k for outstar in outstars for u,v,k in outstar  ])
		for current_edgelabel in all_edgelabels:

			# for all target nodes, mark the last common accessor path
			if current_position == roots:
				new_path = ""
			else:
				new_path = current_path + "." + str(current_edgelabel) if current_path else str(current_edgelabel)

			edge_matches = [ [ edge for edge in outstar if edge[2] == current_edgelabel ] for outstar in outstars ]
			if not all(edge_matches):
				divergence_roots.append({
					"path": new_path,
					"type": "property existence"
				})
			else:
				edge_matches = [ m[0] for m in edge_matches ]
				target_nodevalue_of_edge_matches = [
					tuple( g.nodes[ v ].get(attrname,'') for attrname in node_match_attributes)
					for g,(u,v,k) in zip(graphs, edge_matches)
				]
				for g,(u,v,k) in zip(graphs, edge_matches):
					if not 'common_firstpath' in g.nodes[v]:	g.nodes[v]['common_firstpath'] = new_path
					if not 'common_firstpath' in g[u][v][k]:	g[u][v][k]['common_firstpath'] = new_path

				if len(set(target_nodevalue_of_edge_matches)) > 1:
					divergence_roots.append({
						"path": new_path,
						"type": "value changed"
					})

				if len(set(target_nodevalue_of_edge_matches)) == 1 or continue_after_divergence:
					# enqueue target nodes
					queue.append( [
						[ v for u,v,k in edge_matches],
						new_path
					] )

				if len(set(target_nodevalue_of_edge_matches)) == 1:
					# delete if 
					for g, outstar, edge in zip(graphs,outstars,edge_matches):
						g.remove_edge(*edge)
						outstar.remove(edge)

		visited_positions.add(tuple(current_position))
		while current_position and tuple(current_position) in visited_positions:
			current_position, current_path = queue.popleft() if queue else (None, None)

	g:networkx.MultiDiGraph
	for g in graphs:
		remove = [node for node,degree in g.degree() if degree == 0]
		g.remove_nodes_from(remove)

	divergence_roots.sort(key=lambda x: x['path'])

	return divergence_roots

def diff(
		nxgraphs,
		path_include_keywords=[],
		path_exclude_keywords=[],
		exclude_prototypes=False,
		exclude_indexsuffixed=False,
		edge_attributes=DEFAULT_COMPARISON_EDGE_ATTRIBUTES,
		node_attributes=DEFAULT_COMPARISON_NODE_ATTRIBUTES,
):
	'''Calculates the difference of two graphs'''

	roots_of_change = bfs_tree_subtraction_inplace(nxgraphs)


	# Remove parts of the graph that we want to ignore
	for nxgraph in nxgraphs:
		for u, v, k, edgedata in list(nxgraph.edges(keys=True, data=True)):
			firstpath = edgedata.get("common_firstpath", None) or edgedata["firstpath"]
			edgelabel = edgedata["edgelabel"]

			# maybe discard this difference based on the path
			if path_include_keywords and not any([substring in firstpath for substring in path_include_keywords]) \
			or path_exclude_keywords and any([substring in firstpath for substring in path_exclude_keywords]) \
			or exclude_prototypes and edgelabel == "__proto__" \
			or exclude_indexsuffixed and edgelabel.isnumeric():
				nxgraph.remove_edge(u,v,k)

		list_of_dangling = [node for node in nxgraph.nodes if nxgraph.degree(node) == 0]
		nxgraph.remove_nodes_from(list_of_dangling)

	for root in roots_of_change[:]:
		# maybe discard this difference based on the path
		firstpath = root["path"]
		if path_include_keywords and not any([substring in firstpath for substring in path_include_keywords]) \
		or path_exclude_keywords and any([substring in firstpath for substring in path_exclude_keywords]) \
		or "__proto__" in firstpath \
		or exclude_indexsuffixed and firstpath.isnumeric():
			roots_of_change.remove(root)


	graph_info =  { nxgraph.graph['graph_uuid']: nxgraph.graph for nxgraph in nxgraphs }
	aggregation_result = GraphSetComparisonAggregationResult(
		[ [x.graph['graph_uuid']] for x in nxgraphs ],
		graph_info,
		attribute_names=node_attributes + edge_attributes,
	)

	for nxgraph in nxgraphs:
		for u, v, k, edgedata in nxgraph.edges(keys=True, data=True):
			nodedata = nxgraph.nodes[v]
			firstpath = edgedata.get("common_firstpath", None) or edgedata.get("firstpath", ">>Integrity error! mandatory graph attribute 'firstpath' ist missing!<<")
			aggregation_result.add_data(
				firstpath,
				nxgraph.graph['graph_uuid'],
				{**edgedata, **nodedata}
			)

	aggregation_result = aggregation_result.to_dict()

	# Add the number of connected components

	diff_structure = {
		'connected_components' : {},
		'roots_of_change' : roots_of_change,
		'number_of_paths' : len(aggregation_result['paths'])
	}

	for nxgraph in nxgraphs:
		diff_structure['connected_components'][nxgraph.graph['graph_uuid']] = []
		for cc in networkx.weakly_connected_components(nxgraph):

			# Get the longest common prefix
			list_of_firstpaths_in_this_cc = []
			number_of_edges_in_this_cc = 0
			for u in cc:
				for v in nxgraph[u]:
					for k in nxgraph[u][v]:
						d = nxgraph[u][v][k]
						list_of_firstpaths_in_this_cc.append(d.get("firstpath",""))
						number_of_edges_in_this_cc += 1
			lcp = longestCommonPrefix(list_of_firstpaths_in_this_cc)


			# This doesn't work because the edges don't necessarily have a common_firstpath
			#lcp = longestCommonPrefix([ d.get("common_firstpath", "") or d.get("firstpath", "") for u,v,k,d in nxgraph.edges(cc, keys=True, data=True)])

			# maybe discard this difference based on the path
			if path_include_keywords and not any([substring in lcp for substring in path_include_keywords]):
				continue

			if path_exclude_keywords and any([substring in lcp for substring in path_exclude_keywords]):
				continue

			if exclude_prototypes and "__proto__" in lcp:
				continue

			cc_entry = {
				'longest_common_prefix' : lcp,
				'number_of_nodes' : len(cc),
				'number_of_edges' : number_of_edges_in_this_cc
			}
			diff_structure['connected_components'][nxgraph.graph['graph_uuid']].append(cc_entry)

	aggregation_result['structural_difference'] = diff_structure


	return aggregation_result

##################################
## Utilities / Helper functions ##
##################################


def firstpaths( *nxgraphs ):
	''' Returns the firstpath attribute of all edges. '''
	for graph in nxgraphs:
		for u,v,k,data in graph.edges(data=True, keys=True):
			yield data.get('firstpath',"")


def edgelabels( *nxgraphs ):
	''' Returns the edgelabel attribute of all edges. '''
	for graph in nxgraphs:
		for u,v,k,d in graph.edges(keys=True, data=True):
			yield d.get('edgelabel',"")

def nondeterministics( *nxgraphs ):
	for graph in nxgraphs:
		for u,v,k,data in graph.edges(keys=True, data=True):
			if data.get('isDeterministic') == "false":
				return data['firstpath']

def iter_edge_attributes( graph, attributes=[]):
	for u,v,k,d in graph.edges(keys=True, data=True):
		yield [ d.get(attributename,"") for attributename in attributes ]

def getVEN(graph):
	'''Returns the id of the Virtual Entry Node.'''
	candidates = list( filter( lambda n: n[1] in [True, "true"], graph.nodes(data="isVEN") ) )
	if len(candidates)!=1:
		raise ValueError("There must be exactly one Virtual Entry Node per DOM Graph, but there are", len(candidates))
	return candidates[0][0]

def split_dompath_into_labels(dompath):
	labels = dompath.replace("Symbol(Symbol.","Symbol(Symbol").split(".")
	labels = [ l.replace("Symbol(Symbol","Symbol(Symbol.") for l in labels]
	return labels


def labelpath_to_graphcomponents(nxgraph, labels, entry=None ):
	'''This starts a walk at a node (defaults to the VEN) and traverses the graph by choosing the edges with the given labels.'''

	current_node = entry or list(nxgraph.out_edges(getVEN(nxgraph), keys=True, data=True))[0][1]
	history = []
	out_edges = []

	for label in labels:
		out_edges = list(nxgraph.out_edges(current_node, keys=True, data=True))
		matches = list(filter( lambda edge: edge[3]['edgelabel'] == label, out_edges))
		if len(matches) == 0:
			# Premature ending of the path. No out-edge matches the requested label. Either parameters are wrong, or the graph.
			return None
		elif len(matches) == 1:
			# We found one match. Perfect! Walk on.
			history.append(matches[0])
			source, target, key, data = matches[0]
			current_node = target
		elif len(matches) > 1:
			# What!? The graph is broken!
			raise ValueError("Graph %s has multiple out-edges with the same label '%s' at note '%s'", str(nxgraph),
							 str(label), str(current_node))

	# return the last node, an array of all out-edges thereof, and the history
	return current_node, history, out_edges


def walk_path(nxgraph,strpath):
	labels = split_dompath_into_labels(strpath)
	result = labelpath_to_graphcomponents(nxgraph, labels)
	if result:
		endnode, history, outstar = result
		value = nxgraph.nodes[endnode].get('nodevalue', '')
		return value

def autocomplete(nxgraph,strpath):
	labels = split_dompath_into_labels(strpath)
	result = labelpath_to_graphcomponents(nxgraph, labels)
	if result:
		endnode, history, outstar = result
		completions = [ edgelabel for u,v,edgelabel,d in outstar ]
		return completions

class AbstractGraphBuilder():

	def add_json(self, chunk):
		if chunk['chunk_type'] == "nodes":
			# add nodes
			self.apply_node(chunk)
		elif chunk['chunk_type'] == "edges":
			# add edges
			self.apply_edge(chunk)
		elif chunk['chunk_type'] == "graph":
			# Add the graph-specific data
			self.apply_graph(chunk)
		elif chunk['chunk_type'] == "completegraph":
			# Add the graph-specific data
			self.apply_complete_jsongraph(chunk)
		else:
			raise ValueError("Unkown chunk type")

	def apply_node(self, chunk):
		pass

	def apply_edge(self, chunk):
		pass

	def apply_graph(self, chunk):
		pass

	def apply_complete_jsongraph(self, chunk):
		pass


class JSONNetworkXGraphBuilder(AbstractGraphBuilder):
	def __init__(self, check_wellformity=True):
		self._nxgraph = nx.MultiDiGraph()
		self.check_wellformity = check_wellformity

	@property
	def nxgraph(self):
		'''This will either return a wellformed DEG or raise an expeption. '''
		if self.check_wellformity:
			print("Checking wellformity of DOM Graph")
			assert_DEG_wellformity(self._nxgraph)

		return self._nxgraph

	def apply_node(self, chunk):
		tuplelist = list(map(lambda x: (x['nodeid'], x), chunk['wrapped_items']))
		self._nxgraph.add_nodes_from(tuplelist)

	def apply_edge(self, chunk):
		tuplelist = list(map(lambda x: (x['sourceid'], x['targetid'], x['edgelabel'], x), chunk['wrapped_items']))
		self._nxgraph.add_edges_from(tuplelist)

	def apply_graph(self, chunk):
		assert (len(chunk["wrapped_items"]) == 1)
		graphdata = chunk["wrapped_items"][0]
		for graphattr in graphdata:
			self._nxgraph.graph[graphattr] = graphdata[graphattr]

	def apply_complete_jsongraph(self, chunk):
		jsongraphdata = chunk["wrapped_items"][0]
		if self._nxgraph.number_of_edges() > 0 or self._nxgraph.number_of_nodes() > 0 or len(self._nxgraph.graph) > 0:
			raise ValueError("You tried to load a complete graph into a graph that already has content")
		self._nxgraph = networkx.node_link_graph(
			jsongraphdata,
			directed=True,
			multigraph=True,
			attrs=dict(
				source="source",
				target="target",
				key="key",  #key and edgelabel are redundant. We duplicate edgelabel to key because networkx does delete this attribute while importing
				name="name"
				)
			)


class JSONNeo4JGraphBuilder(AbstractGraphBuilder):

	QUERY_CREATE_NODES = ("UNWIND $props AS properties "
						  "MERGE (n:Object {nodeid : properties.nodeid, graph_uuid: properties.graph_uuid}) "
						  "SET n = properties RETURN n")

	QUERY_CREATE_EDGES_old = ("UNWIND $props AS properties "
						  "MATCH (source:Object), (target:Object) "
						  "WHERE source.nodeid = properties.sourceid AND target.nodeid = properties.targetid "
						  "CREATE (source)-[r:PROPERTY]->(target) "
						  "SET r = properties RETURN r.id ")

	QUERY_CREATE_EDGES = ("UNWIND $props AS properties "
						  "MERGE (source:Object {nodeid : properties.sourceid, graph_uuid: properties.graph_uuid}) "
						  "MERGE (target:Object {nodeid : properties.targetid, graph_uuid: properties.graph_uuid}) "
						  "CREATE (source) -[r:PROPERTY]-> (target) "
						  "SET r = properties ")

	QUERY_CREATE_GRAPH = ("CREATE (graphnode:Graph) "
						  "SET graphnode = $props RETURN graphnode ")

	QUERY_CREATE_INDICES = [ "CREATE INDEX ON :Object(nodeid, graph_uuid)",
							 "CREATE INDEX ON :PROPERTY(graph_uuid)" ]

	def __init__(self, neo4jdbhost, neo4jdbuser, neo4jdbpassword, neo4jdbport):
		from neo4j.v1 import GraphDatabase
		self.uri = "bolt://%s:%d" % (neo4jdbhost, neo4jdbport)
		self.driver = GraphDatabase.driver(self.uri, auth=(neo4jdbuser, neo4jdbpassword))
		self.session = self.driver.session()

		with self.session.begin_transaction() as tx:
			for indexcreationquery in JSONNeo4JGraphBuilder.QUERY_CREATE_INDICES:
				tx.run(indexcreationquery)

	def apply_node(self, chunk):
		with self.session.begin_transaction() as tx:
			tx.run(JSONNeo4JGraphBuilder.QUERY_CREATE_NODES, props=chunk["wrapped_items"])

	def apply_edge(self, chunk):
		with self.session.begin_transaction() as tx:
			tx.run(JSONNeo4JGraphBuilder.QUERY_CREATE_EDGES, props=chunk["wrapped_items"])

	def apply_graph(self, chunk):
		assert (len(chunk["wrapped_items"]) == 1)
		graphdata = chunk["wrapped_items"][0]
		with self.session.begin_transaction() as tx:
			tx.run(JSONNeo4JGraphBuilder.QUERY_CREATE_GRAPH, props=graphdata)


def process_fragmented_jsons(file_contents, graphbuilderclass):
	'''Returns a MultiDiGraph from the fragmented JSON files.'''
	graphbuilder = graphbuilderclass()
	for file_content in file_contents:
		graphbuilder.add_json(file_content)
	return graphbuilder

def longestCommonPrefix(strs):
	if not strs:
		return ""
	shortest_str = min(strs,key=len)
	for i, char in enumerate(shortest_str):
		for other in strs:
			if other[i] != char:
				return shortest_str[:i]
	return shortest_str



class GraphSetComparisonAggregationResult():

	''' 
	This data structure contains the diff'ing result as a table:

		each row is a path in JavaScript. 
			E.g.: 'window.length', 'document.location.href', 'navigator.userAgent' etc.

		each column is a group of graph. That corresponds to browser/browsers/testcases depending on what you're testing.
			E.g.: 'firefox' in column 0, 'chrome' in column 1. 
			E.g.: 'firefox 10' in column 0, 'firefox 100' in column 1. 
			E.g.: 'no_subframes.html' in column 0, 'one_subframe.html' in column 1. 

		each cell contains all distinct values for that combination.
			E.g.: cell ( 'window.length' in 'no_subframes.html' ) had nodevalue '0'
			E.g.: cell ( 'window.length' in 'one_subframe.html' ) had nodevalue '1'
			E.g.: cell ( 'window[0]' in 'one_subframe.html' ) had readerror 'access denied'
	
	'''

	def __init__(self, comparee_uuids, graph_info, attribute_names):
		self.comparees = comparee_uuids
		self.graph_info = graph_info
		# tells you in which set a graph is
		self.set_index = {graph_uuid: i for i, gs in enumerate(self.comparees) for graph_uuid in gs}
		self.attribute_names = list(sorted(attribute_names))
		self.paths = defaultdict(lambda: defaultdict(list))
		self.unique_values_per_firstpath = defaultdict(lambda: defaultdict(set))

	def remove_nodiff_attributes(self):
		copy_of_paths = list(self.paths.keys())
		for firstpath in copy_of_paths:
			# delete every attribute that has the same value.
			for attr_name in self.attribute_names:

				# remove the attribute if all values are the same
				attr_value_list = []
				for set_id in self.paths[firstpath]:
					for data in self.paths[firstpath][set_id]:
						if attr_name in data:
							attr_value_list.append(data[attr_name])

				if len(attr_value_list) > 1 and len(set(attr_value_list)) == 1:
					for set_id in self.paths[firstpath]:
						for index in range(len(self.paths[firstpath][set_id])):
							if attr_name in self.paths[firstpath][set_id][index]:
								del self.paths[firstpath][set_id][index][attr_name]
			
			# check if all attributes have been deleted. If so, delete the path.
			# This can happen if two graphs have identical subgraphs after one point of divergence. 
			# Imagine an array having one entry more than the other. The array object itself changes, but most of the entries below are identical.
			for set_id in self.paths[firstpath]:
				for data in self.paths[firstpath][set_id]:
					if len(data.keys()) > 1: # there's more than the 'graph_uuid' attribute
						break
				else:
					del self.paths[firstpath]

	def merge_entries(self):
		''' 
		Merge the cell values, which might contain duplicate values, into single entries.+
		Only relevant if you diff groups of graphs (e.g. (ff10,ff10) vs. (ff100,ff100) )
		'''
		for firstpath in self.paths:
			for set_id in self.paths[firstpath]:
				entries = self.paths[firstpath][set_id]
				map_changes_to_uuid = defaultdict(set)
				for entry in entries:
					entry_as_tuple = tuple((k, entry[k]) for k in sorted(entry.keys()) if k != "graph_uuid")
					map_changes_to_uuid[entry_as_tuple].add(entry['graph_uuid'])

				new_entries = []
				for unique_tuple in map_changes_to_uuid:
					as_dict = {u: v for u, v in unique_tuple}
					as_dict['src'] = list(map_changes_to_uuid[unique_tuple])
					new_entries.append(
						as_dict
					)
				self.paths[firstpath][set_id] = new_entries

	def to_dict(self):
		self.remove_nodiff_attributes()
		self.merge_entries()
		res = {
			"comparees": self.comparees,
			"graphs": self.graph_info,
			"paths": { firstpath : dict(self.paths[firstpath]) for firstpath in self.paths } # turn defaultdicts into dicts
		}
		return res

	def add_data(self, firstpath, graph_uuid, data_dict):
		set_id = str(self.set_index[graph_uuid])
		new_entry = {}
		for k in self.attribute_names:
			v = data_dict.get(k, "")
			if v and v != "(no data)" and v != "(no%20data)":
				new_entry[k] = v
		new_entry['graph_uuid'] = graph_uuid
		self.paths[firstpath][set_id].append(new_entry)


if __name__ == '__main__':
	import sys
	g1 = nx.read_graphml(sys.argv[1])
	g2 = nx.read_graphml(sys.argv[2])
	pprint(diff([g1,g2]))
