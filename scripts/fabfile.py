# -*- coding: utf-8 -*-
"""
Fabfile for deploying the Mega Web Client.

* To deploy/update the current branch on beta.developers.mega.co.nz:
  fab dev

* To deploy/update a branch on beta.developers.mega.co.nz:
  fab dev:branch-name

* To deploy/update a branch on sandbox3.developers.mega.co.nz:
  fab sandbox dev:branch-name

* To deploy/update a branch on the root of beta.mega.nz:
  fab beta deploy
"""

import os
from fabric.context_managers import cd
from fabric.operations import run
from fabric.state import env
from fabric.api import *

env.target_dir = '/var/www'

BETA_HOST = 'deployer@beta.mega.nz'
BETA_DEV_HOST = 'deployer@beta.developers.mega.co.nz'
SANDBOX3_HOST = 'deployer@sandbox3.developers.mega.co.nz'


@task
def beta():
    """
    Change deployment target to (more) public beta box.
    """
    env.hosts = [BETA_HOST]


@task
def beta_dev():
    """
    Change deployment target to developer beta box.
    """
    env.hosts = [BETA_DEV_HOST]


@task
def sandbox3():
    """
    Change deployment target to sandbox3.
    """
    env.hosts = [SANDBOX3_HOST]


@task
def deploy():
    """
    Deploys to the web root of a server (only use for beta.mega.nz).
    """
    with cd(env.target_dir):
        run("touch current_ver.txt")
        run("cat current_ver.txt >> ~/deployer/last_ver.txt")
        run("git pull -u origin develop")
        run("git rev-parse HEAD > current_ver.txt")
        with cd("logger"):
            run("git pull -u")
        version = run("cat current_ver.txt")
        print("Latest version deployed: {}".format(version)) 
 

def _build_chat_bundle(target_dir):
    """
    Private helper to install production build dependencies and then build
    the React bundle.
    """
    with cd(target_dir):
        run("npm install --production")
        run("scripts/build.sh")
        run("rm -rf node_modules")


@task
def dev(branch_name=''):
    """
    Clones a branch and deploys it to beta.developers.mega.co.nz.
    It will then output a test link which can be pasted into a Redmine
    ticket or run in the browser.

    Usage:
        1) Enter your code directory and run: Fab dev
        2) Alternatively to clone any branch run:
           Fab dev:xxx-branch-name
    """

    # If none other given, use beta.developers server
    if not env.host_string:
        beta_dev()
        env.host_string = BETA_DEV_HOST

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
                     warn_only=True)
        
        # If successful
        if result.return_code == 0:
            # Show last commit from the branch
            with cd(remote_branch_path):
                run('git log -1') 

            # Output beta server test link
            print('\nCloned branch {} to {}'
                  .format(branch_name, remote_branch_path))

        else:
            print('Branch already exists on beta, updating instead.\n')
            with cd(remote_branch_path):
                run('git pull --update-shallow')
                run('git log -1')

        # Update version info.
        version = None
        with cd(remote_branch_path):
            run("touch current_ver.txt")
            run("cat current_ver.txt >> last_ver.txt")
            run("git rev-parse HEAD > current_ver.txt")
            version = run("cat current_ver.txt")

        # Installs dependencies and builds bundles.
        _build_chat_bundle(remote_branch_path)

        # Provide test link and version info.
        host_name = env.host_string.split('@')[-1]
        boot_html = ('sandbox3' if env.host_string == SANDBOX3_HOST
                     else 'devboot-beta')
        print('Test link:\n    https://{host}/{branch_name}'
                '/dont-deploy/{boot_html}.html?apipath=prod'
                .format(host=host_name,
                        branch_name=branch_name,
                        boot_html=boot_html))
        print("Latest version deployed:\n    {}".format(version)) 
