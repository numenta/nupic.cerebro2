#!/usr/bin/env python

import os
import sys
import webbrowser
import subprocess

DESCRIPTION = ("This is to set up a Cerebro2 server and open it in your browser.\n"
		"It is assumed, that you already patched your model or the SP & TP parameters.\n"
		"If not, do this as follows:\n\n"
		"First, patch your model:\n"
		
    		"// Assuming `model` is a CLA model you already have\n\n"
    		"from cerebro2.patcher import Patcher\n"
    		"Patcher().patchCLAModel(model)\n\n"
    		
		"You can also patch an SP or a TP directly:\n"

    		"// Assuming `sp` and `tp` are already defined\n\n"
    		"from cerebro2.patcher import Patcher\n"
    		"Patcher().patchSP(sp)\n"
    		"Patcher().patchTP(tp)\n\n"
    		
    		"Then, after the model / SP / TP has through a number of iterations:\n"
    		"./run_server <PortNumber>\n\n"
    		"To enable taking screenshots with the `p` keyboard shortcut, open `js/classes/abstract_visualization.js` \n"  
    		"and uncomment the line under the note about screenshots.\n"
    		
		"This script also assumes that you have the 'nupic.cerebro2.server' folder inside this directory!\n"
		"For further information read the READMEs in these two folders!\n\n"
		"If last lines for Exit command uncommented:\n"
		"Press Ctrl-C to kill all the processes. \n"
		"(CAUTION: executes 'killall python' !!)\n")

		
def serverSetup(startDir):
    serverDir = os.path.join(startDir, 'nupic.cerebro2.server')
    if not os.path.isdir(serverDir):
      print "Could not find the nupic.cerebro2.server directory! Please copy it into this Directory!\nTerminated."
      return 1
    else:
      os.chdir(serverDir)
      print "Server is being set up...\n"
      subprocess.Popen(["python", "server.py"])


def serverCall(startDir, port):
    staticDir = os.path.join(startDir, 'static')
    os.chdir(staticDir)
    print "Calling the server at port number %s" % port 
    subprocess.Popen(["python", "-m", "SimpleHTTPServer", port])    
    print "Server is up and running at port %s!\n" % port


def openBrowser(port):
    print "Opening port %s in your default Browser..." % port 
    url = "http://localhost:%d" % int(port)
    os.spawnl(os.P_NOWAIT, webbrowser.open_new_tab(url))



if __name__ == "__main__":
  if len(sys.argv) == 1:
    print "Please supply a port to be run on!\nTerminated."
  else:
    print DESCRIPTION
    startDir = os.getcwd()
    port = sys.argv[1]
    serverSetup(startDir)
    serverCall(startDir, port) 
    openBrowser(port)

    # Exit command:
    #if KeyboardInterrupt:
    #	subprocess.Popen(["killall", "python"])
	

