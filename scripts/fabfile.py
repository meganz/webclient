from fabric.context_managers import cd
from fabric.operations import run
from fabric.state import env
from fabric.api import *
import os

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
        run("cat current_ver >> ~/deployer/last_ver")
        run("git pull -u origin develop")
        run("git rev-parse HEAD > current_ver.txt")
        with cd("logger"):
            run("git pull -u")
        version = run("cat current_ver.txt")
        print("Latest version deployed: {}".format(version)) 
 

def build_chat_bundle(target_dir):
    with cd(target_dir):
        run("npm install --production")
        run("scripts/build.sh")


def dev(branch_name=''):
    """
    Clones a branch on the GitLab server and creates it under a directory 
    on the beta.developers.mega.co.nz server. It will then output a test 
    link which can be pasted into a Redmine ticket or run in the browser.

    Usage:
        1) Enter your code directory and run: Fab dev
        2) Alternatively to clone any branch run:
           Fab dev:xxx-branch-name
    """

    # Use beta.developers server
    env.host_string = 'deployer@beta.developers.mega.co.nz'

    # Get the current branch if not passed in
    if branch_name == '':
        branch_name = local('git rev-parse --abbrev-ref HEAD', capture=True)
    
    # Get the remote path e.g. /var/www/xxx-branch-name
    remote_branch_path = os.path.join(env.target_dir, branch_name)
    
    # Clone the repo into /var/www/xxx-branch-name
    # but not the full git history to save on storage space
    with cd(env.target_dir):
        result = run('git clone --depth 1'
                     ' git@code.developers.mega.co.nz:web/webclient.git'
                     ' {} -b {}'.format(branch_name, branch_name),
                     arn_only=True)
        
        # If successful
        if result.return_code == 0:
            
            # Show last commit from the branch
            with cd(remote_branch_path):
                run('git log -1') 

            # Installs dependencies and builds bundles.
            build_chat_bundle(remote_branch_path)
            
            # Output beta server test link
            print('\nCloned branch {} to {}'
                  .format(branch_name, remote_branch_path))
            print('Test link: https://beta.developers.mega.co.nz/{}'
                  '/dont-deploy/sandbox3.html?apipath=prod'.format(branch_name))

        else:
            print('Branch already exists on beta, updating instead.\n')
            devupdate(branch_name)


def devupdate(branch_name=''):
    """
    Updates the beta.developers server with the latest code.

    Usage:
        1) Enter your code directory and run: Fab devupdate
        2) Alternatively to update any branch on the server run:
           Fab devupdate:xxx-branch-name
    """

    # Use beta.developers server
    env.host_string = 'deployer@beta.developers.mega.co.nz'

    # Get the current branch if not passed in
    if branch_name == '':
        branch_name = local('git rev-parse --abbrev-ref HEAD', capture=True)
    
    # Get the remote path e.g. /var/www/xxx-branch-name
    remote_branch_path = os.path.join(env.target_dir, branch_name)

    # Update the repo with latest code in branch
    with cd(remote_branch_path):
        run('git pull --update-shallow')
        run('git log -1')

    # Output beta server test link
    print('\nTest link: https://beta.developers.mega.co.nz/{}'
          '/dont-deploy/sandbox3.html?apipath=prod'.format(branch_name))
