from fabric.context_managers import cd
from fabric.operations import run
from fabric.state import env
from fabric.api import *

env.target_dir = '/var/www'

def beta():
    """
    Change deployment target to (more) public beta box.
    """
    env.hosts = ['deployer@beta.mega.nz']

def sandbox3():
    env.hosts = ['deployer@sandbox3.developers.mega.co.nz']

def deploy():
    with cd(env.target_dir):
        run("touch current_ver")
        run("cat current_ver>>~/deployer/last_ver")
        run("git pull -u origin develop")
        run("git rev-parse HEAD>current_ver.txt")
        with cd("logger"):
            run("git pull -u")
        print "Latest version deployed: ", run("cat current_ver.txt")


"""
Clones a branch on the GitLab server and creates it under a directory 
on the beta.developers.mega.co.nz server. It will then output a test 
link which can be pasted into a Redmine ticket or run in the browser.
Usage:
    1) Enter your code directory and run: Fab dev
    2) Alternatively to clone any branch run:
       Fab dev:xxx-branch-name
"""
def dev(branchName = ''):

    # Use beta.developers server
    env.host_string = 'deployer@beta.developers.mega.co.nz'

    # Get the current branch if not passed in
    if (branchName == ''):
        branchName = local('git rev-parse --abbrev-ref HEAD', capture=True)
    
    # Get the remote path e.g. /var/www/xxx-branch-name
    remoteBranchPath = env.target_dir + '/' + branchName

    # Clone the repo into /var/www/xxx-branch-name
    # but not the full git history to save on storage space
    with cd(env.target_dir):
        result = run('git clone --depth 1 git@code.developers.mega.co.nz:web/webclient.git ' + branchName + ' -b ' + branchName, warn_only=True)
        
        # If successful
        if result.return_code == 0:
            
            # Show last commit from the branch
            run('cd ' + remoteBranchPath + ' && git log -1') 

            # Output beta server test link
            print '\nCloned branch ' + branchName + ' to ' + remoteBranchPath
            print 'Test link: https://beta.developers.mega.co.nz/' + branchName + '/dont-deploy/sandbox3.html?apipath=prod'

        else:
            print 'Branch already exists on beta, updating instead.\n'
            devupdate(branchName)


"""
Updates the beta.developers server with the latest code.
Usage:
    1) Enter your code directory and run: Fab devupdate
    2) Alternatively to update any branch on the server run:
       Fab devupdate:xxx-branch-name
"""
def devupdate(branchName = ''):

    # Use beta.developers server
    env.host_string = 'deployer@beta.developers.mega.co.nz'

    # Get the current branch if not passed in
    if (branchName == ''):
        branchName = local('git rev-parse --abbrev-ref HEAD', capture=True)
    
    # Get the remote path e.g. /var/www/xxx-branch-name
    remoteBranchPath = env.target_dir + '/' + branchName

    # Update the repo with latest code in branch
    with cd(remoteBranchPath):
        run('git pull --update-shallow')
        run('git log -1')

    # Output beta server test link
    print '\nTest link: https://beta.developers.mega.co.nz/' + branchName + '/dont-deploy/sandbox3.html?apipath=prod'