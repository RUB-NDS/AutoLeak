import yaml
from pprint import pprint
import re
from testing.testsuite_tagging import testcases

def tag(list_of_diffpaths, tagconfig, append_star=False):
	tagrules = tagconfig['tags']
	nomatchlabel = tagconfig['nomatch']
	tags_for_all = set()
	for testline in list_of_diffpaths:
		if not testline: continue
		tags_for_line = set()
		for tagrulename in tagrules:
			taglabel = tagrules[tagrulename]['label']
			tagregexes = tagrules[tagrulename]['regex']

			# Go through all rules and add the matching tags
			for regex in tagregexes:
				match = re.search(regex, testline)
				if match:
					taglabel = taglabel.format(*list(match.groups()))
					# if there is more stuff behind the matching section, add a marker to the label
					if append_star and match.span()[1] < (len(testline)-1):
						taglabel += "*"
					tags_for_line.add(taglabel)
					break
		if len(tags_for_line) == 0:
			# no tag rules applied? Add the nomatch label.
			tags_for_line.add(nomatchlabel)
		tags_for_all.update(tags_for_line)
	return list(sorted(list(tags_for_all)))

def load_tagrules(stream):
	tagconfig = yaml.safe_load(stream)
	# normalize the ease-of-life improvements, to the schema is consistent
	tagrules = tagconfig['tags']
	nomatchlabel = tagconfig['nomatch']

	for tagrulename in tagrules:
		if type(tagrules[tagrulename]) == dict:
			if "label" not in tagrules[tagrulename]:
				# Use the rule's name as the label, or a proper one if provided
				tagrules[tagrulename]['label'] = tagrulename
			if type( tagrules[tagrulename]['regex'] ) == str:
				tagrules[tagrulename]['regex'] = [ tagrules[tagrulename]['regex'] ]
		elif type(tagrules[tagrulename]) == str:
			tagrules[tagrulename] = {
				'label' : tagrulename,
				'regex' : [ tagrules[tagrulename] ]
			}
		else:
			raise ValueError("The tag rules yaml is incorrect")
	return tagconfig

if __name__ == '__main__':
	with open('config/tagrules.yml', 'r') as f:
		tagrules = load_tagrules(f)
	pprint(tagrules)
	for testcase in testcases:
		print("PATH:", testcase)
		tags = tag([testcase], tagrules)
		print("TAGS:", ",".join(tags))
		print()
