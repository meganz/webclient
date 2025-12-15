import argparse, os

parser = argparse.ArgumentParser()
parser.add_argument("-u", "--update", nargs="?", help="Uploads the given file", const=True, default=False)
parser.add_argument("-c", "--component", nargs=1, help="The Weblate component to perform the action for")
parser.add_argument("-f", "--filepath", nargs=1, help="The file to process or output to")
parser.add_argument("-s", "--startpath", nargs=1, help="The start path in the repository where the strings files will be stored. e.g: /feature/")
parser.add_argument("-l", "--library", nargs=1, help="The specific library to interact with. Only should be used in the library project. e.g: -l auth = Localizable_auth_lib")
parser.add_argument("-p", "--production", nargs="?", help="Enable production build mode to download all resources", const=True, default=False)
parser.add_argument("-cl", "--charlimit", nargs="?", help="If when uploading strings character limits should be added as well", const=True, default=False)
parser.add_argument("-a", "--application", nargs=1, help="Application parser version to run e.g: android or ios")
parser.add_argument("-v", "--verbose", nargs="?", help="Enable verbose logging", const=True, default=False)
args = parser.parse_args()

is_android = False
is_ios = False
if not args.application:
    print("Error: Must specify a valid application parser. None specified")
    os._exit(1)
if args.application[0][:3].lower() == "ios":
    is_ios = True
elif args.application[0][:3].lower() == "and":
    is_android = True
else:
    print("Error: Must specify a valid application parser. Found: " + str(args.application[0]))
    os._exit(1)
update = args.update or False
component = args.component[0] if args.component else False
file_path = args.filepath[0] if args.filepath else False
start_path = args.startpath or False
library = args.library[0] if args.library else ""
production = args.production or False
char_limit = args.charlimit or False
verbose = args.verbose or False
