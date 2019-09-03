# -*- coding: utf-8 -*-
"""
Fabfile for deploying the Mega Web Client.

* To deploy/update the current branch on beta.developers.mega.co.nz:
  fab dev

* To deploy/update a specific branch on beta.developers.mega.co.nz:
  fab dev:branch_name=1657-simple-translations

* To build bundle.js as well for React changes:
  fab dev:build_bundle=True  OR  fab dev:1

* To build bundle.js and deploy to a specific branch:
  fab dev:build_bundle=True,branch_name=1657-simple-translations

* To delete previously deployed beta and re-deploy the current branch on beta.developers.mega.co.nz:
  fab dev:del_exist=True or fab dev:del_exist=1

* To build a test Firefox extension:
  fab dev:build_firefox_ext=True or fab dev:build_firefox_ext=1

* To build a test Chrome extension:
  fab dev:build_chrome_ext=True or fab dev:build_chrome_ext=1

* To build both extensions:
  fab dev:build_firefox_ext=True,build_chrome_ext=True or fab dev:build_firefox_ext=1,build_chrome_ext=1

* To deploy/update a branch on sandbox3.developers.mega.co.nz:
  fab sandbox dev:branch_name=1657-simple-translations

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
BETA_DEV_HOST = 'deployer@beta.developers.mega.co.nz:28999'
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


@task
def dev(build_bundle=False, branch_name='', del_exist=False, build_firefox_ext=False, build_chrome_ext=False, fetch_lang=False):
    """
    Clones a branch and deploys it to beta.developers.mega.co.nz.
    It will then output a test link which can be pasted into a Redmine
    ticket or run in the browser.

    Usage:
        1) Enter your code directory and run: Fab dev
        2) Alternatively to clone any branch run:
           Fab dev:xxx-branch-name
        3) Delete existing branch on beta and clone new one:
           Fab dev:del_exist=True
    """

    # If none other given, use beta.developers server
    if not env.host_string:
        beta_dev()
        env.host_string = BETA_DEV_HOST

    # Get the current branch if not passed in
    if branch_name == '':
        branch_name = local('git rev-parse --abbrev-ref HEAD', capture=True)

    # If branch name is still empty, something is wrong.
    if branch_name == '':
        print('Something went wrong with get current branch name.\n');
        exit();

    # Get the remote path e.g. /var/www/xxx-branch-name
    remote_branch_path = os.path.join(env.target_dir, branch_name)

    # Delete existing branch.
    if del_exist:
        print('deleting existing {} branch.\n').format(branch_name)
        run('rm -rf {}'.format(remote_branch_path))

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
                # Force revert the bundle.js IF it was re-built in earlier deployments
                run('git checkout js/chat/bundle.js')
                run('git pull --update-shallow')
                run('git log -1')

        print('Pulling latest language file from babel.\n')
        with cd(remote_branch_path):
            run('./scripts/lang.sh')

        # Update version info.
        version = None
        with cd(remote_branch_path):
            run("touch current_ver.txt")
            run("cat current_ver.txt >> last_ver.txt")
            run("git rev-parse HEAD > current_ver.txt")
            version = run("cat current_ver.txt")

        # Installs dependencies and builds bundles.
        if build_bundle:
            _build_chat_bundle(remote_branch_path)

        # Keep just the hostname e.g. deployer@beta.developers.mega.co.nz:28999 -> beta.developers.mega.co.nz
        host_name = env.host_string.split('@')[-1].split(':')[0]

        boot_html = ('sandbox3' if env.host_string == SANDBOX3_HOST
                     else 'devboot-beta')

        # Build the Firefox extension if requested
        if build_firefox_ext:
	    with cd('~/deployment/webclient-updatebuild/'):
                run('BETA_BUILD=1 BETA_WEBCLIENT_PATH=/var/www/' + branch_name + ' php 2b-update-firefox-web-ext.php')

        # Build the Chrome extension if requested
        if build_chrome_ext:
	    with cd('~/deployment/webclient-updatebuild/'):
                run('BETA_BUILD=1 BETA_WEBCLIENT_PATH=/var/www/' + branch_name + ' php 2a-update-chrome.php')   
		
        # Provide test link
        print('Test link: https://{branch_name}.{host}/dont-deploy/sandbox3.html?apipath=prod&jj=1'
            .format(host=host_name.replace("beta.", ""),
                branch_name=branch_name,
                boot_html=boot_html))

        # Provide test link to Firefox ext
        if build_firefox_ext:
            print('Firefox ext link: https://{branch_name}.{host}/meganz.xpi'
                .format(host=host_name.replace("beta.", ""), branch_name=branch_name))

        # Provide test link to Chrome ext
        if build_chrome_ext:
            print('Chrome ext link: https://{branch_name}.{host}/chrome-extension.zip'
                .format(host=host_name.replace("beta.", ""), branch_name=branch_name))

        # Provide commit info
        print("Latest commit deployed: {}".format(version))

