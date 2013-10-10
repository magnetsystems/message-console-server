#!/usr/bin/python

"""
Utility script to get values from package.json file
Input is a joson file and a json path using [], e.g. ["name"] or ["dependencies"]["ejs"]
"""

import json
import sys

USAGE_STR = """
Usage: 
%s jsonfile 'jsonpath'

where jsonpath looks something like ["name"] or ["dependencies"]["ejs"]

example: %s package.json '["name"]'
"""

def usage(errStr):
	print errStr
	print USAGE_STR % (sys.argv[0], sys.argv[0])
	sys.exit(1)
	
if len(sys.argv) < 3:
	usage("Not enough args")
	
jsonFile = sys.argv[1]	
jsonPath = "data" + sys.argv[2]

try:
	jsonData=open(jsonFile)
except IOError:
	usage("Error reading file " + jsonFile)

data = json.load(jsonData)

try:
	print eval(jsonPath)
except NameError:
	print "json path is not valid"
	sys.exit(1)
