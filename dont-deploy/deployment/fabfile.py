from fabric.context_managers import cd
from fabric.operations import run
from fabric.state import env


def beta():
    env.hosts = ['deployer@beta.mega.nz']


def deploy():
    with cd("/var/www"):
        run("cat current_ver>>~/deployer/last_ver")
        run("git rev-parse HEAD>current_ver.txt")
        print "Latest version deployed: ", run("cat current_ver.txt")