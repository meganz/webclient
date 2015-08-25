from fabric.context_managers import cd
from fabric.operations import run
from fabric.state import env

env.target_dir = '/var/www'

def development():
    """
    Change deployment target to development beta box.
    """
    env.hosts = ['deployer@beta.developers.mega.co.nz']
    env.target_dir = '/var/www/newdesign'

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
