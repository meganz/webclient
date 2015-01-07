from fabric.context_managers import cd
from fabric.operations import run
from fabric.state import env


def beta():
    env.hosts = ['deployer@beta.mega.nz']

def sandbox3():
    env.hosts = ['deployer@sandbox3.developers.mega.co.nz']

def deploy():
    with cd("/var/www"):
        run("touch current_ver")
        run("cat current_ver>>~/deployer/last_ver")
        run("git pull -u")
        run("git rev-parse HEAD>current_ver.txt")
        with cd("logger"):
            run("git pull -u")
        print "Latest version deployed: ", run("cat current_ver.txt")
