#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Selenium test runner.

You need a mega.nz account to run the tests, and that account should have a
single (and small) file on it. Ideally, create a new account and upload a
file of 1KB just for these tests, and don't do anything else on it.
Run this script with the --help flag for further details.

Requirements:
    - Selenium Python Webdriver: pip install -U selenium
    - WebDriver for Chrome: https://sites.google.com/a/chromium.org/chromedriver/home
    - Pillow for visual diffs: pip install pillow

This test runner will work with both Python 2.7 as well as 3.x.
"""

from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import NoAlertPresentException
import unittest, time, re, os, sys, argparse, tempfile
from PIL import ImageChops, Image

vdiffs=False
username=None
password=None
base_url="https://smoketest.static.mega.co.nz"

# This test suite includes:
#
#    RunLevel  TestCase
#    --------  ------------------------
#        0001  Login
#        0002  New Folder
#        0004  Empty Rubbish
#        0004  Reload
#        0005  Switch Sections
#        0006  Context Actions
#        0007  Settings
#        0008  Recovery Key
#        0011  Blog
#        0013  Filelink
#        0014  Folderlink
#        0015  Help
#        0999  Logout
#        1000  Ephemeral

class MegaTest(unittest.TestCase):
    def setUp(self):
        chrome_options = Options()
        chrome_options.add_argument("--lang=en")
        chrome_options.add_argument("--window-size=1270,812")
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Selenium; %s) Chrome/256.3.14' % webdriver.__version__)
        chrome_options.add_experimental_option("prefs", {'download.prompt_for_download': 'false',
                                                         'download.default_directory': tempfile.gettempdir()})
        self.driver = webdriver.Chrome(chrome_options=chrome_options)
        # self.driver.implicitly_wait(2)
        self.base_url = base_url
        self.verificationErrors = []
        self.accept_next_alert = True
        self.wait30 = WebDriverWait(self.driver,30)
        self.wait10 = WebDriverWait(self.driver,10)
        self.path = os.path.dirname(os.path.realpath(__file__))

    def test_suite(self):
        driver = self.driver
        driver.get(self.base_url + "/")
        #
        # Test: 0001  Login
        self.waitfor_visibility("div.st-social-block > a.st-bottom-button.st-facebook-button")
        self.visual_diff('homepage.png')
        self.driver.execute_script("""localStorage.testChatDisabled=1""")
        driver.find_element_by_link_text("Login").click()
        driver.find_element_by_id("login-name").clear()
        driver.find_element_by_id("login-name").send_keys(username)
        driver.find_element_by_id("login-password").clear()
        driver.find_element_by_id("login-password").send_keys(password)
        driver.find_element_by_css_selector(".top-head .top-dialog-login-button").click()
        self.waitfor_text(".loading-info li.step3.loading", "Decrypting")
        self.waitfor_invisibility(".loading-info li.loading")
        self.waitfor_text(".fm-file-upload span", "File Upload")
        # 
        # Test: 0002  New Folder
        # Create new folder
        driver.find_element_by_css_selector("div.fm-new-folder").click()
        driver.find_element_by_css_selector("div.create-new-folder div.create-folder-input-bl > input[type=\"text\"]").click()
        driver.find_element_by_css_selector("div.create-new-folder div.create-folder-input-bl > input[type=\"text\"]").clear()
        driver.find_element_by_css_selector("div.create-new-folder div.create-folder-input-bl > input[type=\"text\"]").send_keys("000.foldertest")
        driver.find_element_by_css_selector("div.create-folder-button").click()
        self.waitfor_text("span.tranfer-filetype-txt", "000.foldertest")
        self.assertEqual("000.foldertest", driver.find_element_by_css_selector(".content-panel.cloud-drive .nw-fm-tree-item").text)
        # Remove the created folder
        self.fire_contextmenu(By.CSS_SELECTOR, "tr.folder span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.remove-item")
        for i in range(60):
            try:
                if re.search(r"^Are you sure that you want to move [\s\S]* to the rubbish bin[\s\S]$", driver.find_element_by_css_selector("div.fm-notification-info p").text): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0002  New Folder")
        driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog.remove-dialog .notification-button.confirm").click()
        self.waitfor_nottext("span.tranfer-filetype-txt", "000.foldertest")
        # 
        # Test: 0004  Empty Rubbish
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.rubbish-bin").click()
        driver.find_element_by_css_selector("div.fm-clearbin-button").click()
        self.waitfor_text(".fm-notification-warning", "You cannot undo this action.")
        driver.find_element_by_css_selector(".fm-dialog.clear-bin-dialog .notification-button.confirm").click()
        self.waitfor_visibility(".fm-empty-trashbin .fm-empty-cloud-txt")
        self.visual_diff('rubbish.png')
        # 
        # Test: 0004  Reload
        driver.find_element_by_css_selector(".top-icon.menu").click()
        self.on_visibleclick("div.top-menu-item.refresh-item")
        self.waitfor_visibility("div.fm-notification-warning")
        self.assertEqual("Are you sure you want to continue?", driver.find_element_by_css_selector("div.fm-notification-warning").text)
        driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog .notification-button.confirm").click()
        self.waitfor_text(".loading-info li.step1.loading", "Requesting account data")
        self.waitfor_visibility(".fm-empty-trashbin .fm-empty-cloud-txt")
        # 
        # Test: 0005  Switch Sections
        # Switch to Contacts section and check that some elements are there...
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.contacts").click()
        driver.find_element_by_css_selector("div.fm-add-user > span").click()
        self.assertEqual("Import Contacts...", driver.find_element_by_css_selector("div.import-contacts-link").text)
        driver.find_element_by_css_selector("div.add-user-size-icon.full-size").click()
        driver.find_element_by_css_selector("div.import-contacts-link").click()
        self.waitfor_text(".import-contacts-service.gmail", "Gmail")
        driver.find_element_by_css_selector("div.add-user-popup.dialog > div.fm-dialog-close").click()
        self.assertEqual("View received requests", driver.find_element_by_css_selector("div.fm-received-requests").text)
        self.assertEqual("View sent requests", driver.find_element_by_css_selector("div.fm-contact-requests").text)
        # Switch to 'Shared with me' section
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.shared-with-me").click()
        self.assertTrue(self.is_element_present(By.CSS_SELECTOR, "span.right-arrow-bg.ui-draggable"))
        self.assertEqual("My incoming shares", driver.find_element_by_css_selector("div.nw-tree-panel-header > span").text)
        driver.find_element_by_css_selector("div.nw-tree-panel-arrows").click()
        self.assertEqual("Ascending", driver.find_element_by_css_selector(".nw-sorting-menu > .dropdown-section > .sorting-menu-item[data-dir='1']").text)
        # Switch back to Cloud
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.cloud-drive").click()
        driver.find_element_by_css_selector("a.fm-files-view-icon.block-view").click()
        self.fire_contextmenu(By.CSS_SELECTOR, "span.block-view-file-type")
        self.on_visibleclick("a.dropdown-item.properties-item")
        self.assertEqual("Created:", driver.find_element_by_css_selector("div.properties-float-bl > div.properties-small-gray").text)
        driver.find_element_by_css_selector(".fm-dialog.properties-dialog .fm-dialog-close").click()
        driver.find_element_by_css_selector("a.fm-files-view-icon.listing-view").click()
        for i in range(60):
            try:
                if 1 == len(driver.find_elements_by_xpath("//tr//span[@class='tranfer-filetype-txt']")): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0005  Switch Sections")
        # 
        # Test: 0006  Context Actions
        # Favourite
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.add-star-item")
        self.assertTrue(self.is_element_present(By.CSS_SELECTOR, "span.grid-status-icon.star"))
        # Remove Favourite
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.add-star-item")
        # Get link
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.getlink-item")
        self.waitfor_visibility("div.copyrights-dialog-head")
        self.assertEqual("Copyright warning to all users", driver.find_element_by_css_selector("div.copyrights-dialog-head").text)
        driver.find_element_by_css_selector(".fm-dialog.copyrights-dialog .accept").click()
        self.waitfor_visibility(".fm-dialog.export-links-dialog .fm-dialog-title")
        self.assertEqual("Export file links and decryption keys", driver.find_element_by_css_selector(".fm-dialog.export-links-dialog .fm-dialog-title").text)
        self.assertEqual("Link with key", driver.find_element_by_css_selector("div.link-handle-and-key span.text").text)
        driver.find_element_by_css_selector("div.link-handle-and-key").click()
        self.waitfor_visibility(".file-link-info-wrapper .file-link-info.key")
        self.assertTrue(driver.find_element_by_css_selector(".export-link-item .export-item-title").is_displayed())
        driver.find_element_by_css_selector(".fm-dialog.export-links-dialog .fm-dialog-close").click()
        # Remove Link
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.removelink-item")
        self.waitfor_invisibility(".dark-overlay")
        # Rename
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.rename-item")
        self.waitfor_visibility(".fm-dialog.rename-dialog")
        oldName = driver.find_element_by_css_selector("span.tranfer-filetype-txt").text
        newName = "zzzz"
        driver.find_element_by_name("dialog-rename").clear()
        driver.find_element_by_name("dialog-rename").send_keys(newName)
        driver.find_element_by_css_selector(".rename-dialog-button.rename").click()
        self.waitfor_text("span.tranfer-filetype-txt", newName)
        # Rename Back
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.rename-item")
        self.waitfor_visibility(".fm-dialog.rename-dialog")
        driver.find_element_by_name("dialog-rename").clear()
        driver.find_element_by_name("dialog-rename").send_keys(oldName)
        driver.find_element_by_css_selector(".rename-dialog-button.rename").click()
        self.waitfor_text("span.tranfer-filetype-txt", oldName)
        # Copy
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.copy-item")
        self.waitfor_visibility(".fm-dialog.copy-dialog")
        self.assertTrue(driver.find_element_by_css_selector(".copy-dialog-button.cloud-drive.active").is_displayed())
        driver.find_element_by_css_selector(".fm-dialog.copy-dialog .dialog-copy-button").click()
        self.waitfor_text(".duplicate-conflict.action-block.a3 .duplicate-conflict.red-header", "Keep both files")
        driver.find_element_by_css_selector(".duplicate-conflict.action-block.a3 .duplicate-conflict.red-header").click()
        for i in range(60):
            try:
                if 2 == len(driver.find_elements_by_xpath("//tr//span[@class='tranfer-filetype-txt']")): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        # Move
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.fire_mouseover(By.CSS_SELECTOR, "a.dropdown-item.move-item.contains-submenu")
        self.on_visibleclick("a.dropdown-item.remove-item")
        self.waitfor_visibility(".fm-dialog.confirmation-dialog.remove-dialog")
        driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog.remove-dialog .notification-button.confirm").click()
        for i in range(60):
            try:
                if 1 == len(driver.find_elements_by_xpath("//tr//span[@class='tranfer-filetype-txt']")): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        # 
        # Test: 0007  Settings
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.account").click()
        # Overview
        self.waitfor_visibility(".fm-account-profile .account.tabs-bl")
        self.assertEqual("General", driver.find_element_by_css_selector(".account.tab-lnk.active").text)
        self.assertEqual("Email & Password", driver.find_element_by_css_selector(".account.tab-lnk[data-tab='email-and-pass']").text)
        self.assertEqual("Payment and Plan", driver.find_element_by_css_selector(".account.tab-lnk[data-tab='payment']").text)
        self.assertEqual("Cancel your account", driver.find_element_by_css_selector(".account.data-block.second .button.default-grey-button.cancel-account.right").text)
        self.assertEqual("Upgrade Account", driver.find_element_by_css_selector(".account.data-block.second .button.default-white-button.upgrade-to-pro.right span").text)
        # Profile
        oldName = driver.find_element_by_id("account-firstname").get_attribute("value")
        driver.find_element_by_id("account-firstname").clear()
        driver.find_element_by_id("account-firstname").send_keys("")
        driver.find_element_by_id("account-firstname").send_keys(u"ñ")
        self.waitfor_visibility(".fm-account-save-block")
        driver.find_element_by_css_selector(".fm-account-save-block .fm-account-save").click()
        self.waitfor_text(".user-name", u"ñ")
        driver.find_element_by_id("account-firstname").clear()
        driver.find_element_by_id("account-firstname").send_keys("")
        driver.find_element_by_id("account-firstname").send_keys(oldName)
        self.waitfor_visibility(".fm-account-save-block")
        driver.find_element_by_css_selector(".fm-account-save-block .fm-account-save").click()
        self.waitfor_text(".user-name", oldName)
        # History
        driver.find_element_by_css_selector(".fm-account-button.history").click()
        self.waitfor_visibility(".fm-account-history-head .fm-account-header.left")
        driver.find_element_by_css_selector(".account-history-dropdown-button.sessions").click()
        driver.find_element_by_css_selector("div.account-history-drop-items.session100-").click()
        self.waitfor_invisibility(".dark-overlay")
        # 
        # Test: 0008  Recovery Key
        driver.find_element_by_css_selector(".top-icon.menu").click()
        self.on_visibleclick("div.top-menu-item.backup")
        self.waitfor_text("h3.main-italic-header", "Backup your master encryption key")
        self.assertEqual("MEGA-RECOVERYKEY.txt (22 bytes)", driver.find_element_by_css_selector(".backup-file-info > span").text)
        self.assertTrue(22 == len(driver.find_element_by_css_selector("#backup_keyinput").get_attribute("value")))
        self.assertEqual("Your password unlocks your Recovery Key", driver.find_element_by_css_selector(".main-left-block h5.main-italic-header").text)
        self.assertEqual("Save Recovery Key as text file", driver.find_element_by_css_selector(".main-right-block h5.main-italic-header span").text)
        # 
        # Test: 0011  Blog
        driver.find_element_by_css_selector(".top-icon.menu").click()
        self.on_visibleclick("div.top-menu-item.blog")
        self.waitfor_invisibility(".dark-overlay")
        self.assertEqual("Archive", driver.find_element_by_css_selector("h1").text)
        self.assertTrue(driver.find_element_by_css_selector("div.blog-new-item").is_displayed())
        driver.find_element_by_link_text("Read more").click()
        self.waitfor_visibility(".blog-new-full")
        self.assertTrue(driver.find_element_by_id("blogarticle_title").is_displayed())
        # 
        # Test: 0013  Filelink
        # FileLink - Visit TakenDown file
        driver.get(self.base_url + "#!okESgTYL!2DQn0aszTUeR8Xo-FiCY9SGyEBlQSGryKAGoaMFFZpw")
        self.waitfor_visibility("div.download.error-title")
        self.assertEqual("The file you are trying to download is no longer available.", driver.find_element_by_css_selector("div.download.error-title").text)
        self.assertFalse(driver.find_element_by_css_selector(".download-button.to-clouddrive").is_displayed())
        self.visual_diff('filelink-takedown.png')
        # FileLink - Download
        driver.get(self.base_url + "#!84Vl0ADI")
        self.waitfor_text(".fm-dialog.dlkey-dialog .fm-dialog-title", "Enter decryption key")
        self.visual_diff('filelink-keydialog.png')
        driver.find_element_by_css_selector(".fm-dialog.dlkey-dialog input").clear()
        driver.find_element_by_css_selector(".fm-dialog.dlkey-dialog input").send_keys("Fj9EOhlQu4mN_ZwlUNIHCD6xc2xMKCEjSFvEEvypx9o")
        driver.find_element_by_css_selector(".fm-dialog.dlkey-dialog .default-white-button").click()
        self.waitfor_visibility(".download-button.throught-browser")
        self.assertTrue(driver.find_element_by_css_selector(".download-button.to-clouddrive").is_displayed())
        self.assertEqual("file4.bin", driver.find_element_by_css_selector(".download.info-txt.big-txt.filename").text)
        self.assertEqual("46 KB", driver.find_element_by_css_selector(".download.info-txt.small-txt").text)
        driver.find_element_by_css_selector(".download-button.throught-browser").click()
        for i in range(60):
            try:
                if re.search(r"^[\s\S]*ompleted$", driver.find_element_by_css_selector(".download.status-txt.green").text): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0013  Filelink")
        # Filelink - Import
        driver.find_element_by_css_selector(".button.download-button.to-clouddrive").click()
        self.waitfor_text("span.tranfer-filetype-txt", "file4.bin")
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.remove-item")
        for i in range(60):
            try:
                if re.search(r"^Are you sure that you want to move [\s\S]* to the rubbish bin[\s\S]$", driver.find_element_by_css_selector("div.fm-notification-info p").text): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0013  Filelink")
        driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog.remove-dialog .notification-button.confirm").click()
        # 
        # Test: 0014  Folderlink
        driver.get(self.base_url + "#F!9sUAGZ4R")
        driver.refresh()
        self.waitfor_text(".fm-dialog.dlkey-dialog .fm-dialog-title", "Enter decryption key")
        driver.find_element_by_css_selector(".fm-dialog.dlkey-dialog input").clear()
        driver.find_element_by_css_selector(".fm-dialog.dlkey-dialog input").send_keys("moe6GANiPRawdt3ZUFLp4g")
        driver.find_element_by_css_selector(".fm-dialog.dlkey-dialog .default-white-button").click()
        driver.refresh()
        self.waitfor_text(".grid-table-header .arrow.ts", "Date created")
        self.assertEqual("Import to my cloud drive", driver.find_element_by_css_selector(".fm-import-to-cloudrive").text)
        self.visual_diff('folderlink.png')
        # FolderLink - Download as ZIP
        driver.find_element_by_css_selector(".fm-download-as-zip").click()
        driver.find_element_by_css_selector(".fm-main.default.active-folder-link .nw-fm-left-icon.transfers").click()
        self.waitfor_text("tr#zip_1 .transfer-status", "Completed")
        driver.find_element_by_css_selector(".fm-main.default.active-folder-link .nw-fm-left-icon.folder-link").click()
        self.waitfor_visibility(".nw-fm-tree-header.folder-link")
        # FolderLink - Import to Cloud Drive
        self.fire_contextmenu(By.CSS_SELECTOR, ".fm-main.default.active-folder-link .nw-fm-left-icon.folder-link")
        self.on_visibleclick("a.dropdown-item.import-item")
        self.waitfor_visibility(".fm-dialog.copy-dialog")
        self.assertEqual("Import", driver.find_element_by_css_selector(".fm-dialog.copy-dialog .dialog-copy-button span").text)
        driver.find_element_by_css_selector(".fm-dialog.copy-dialog .dialog-copy-button").click()
        self.waitfor_visibility(".fm-dialog.warning-dialog-a")
        self.assertRegexpMatches(driver.find_element_by_css_selector(".fm-dialog.warning-dialog-a .fm-notification-info").text, r"^[\s\S]*imported successfully\.$")
        driver.find_element_by_css_selector(".fm-dialog.warning-dialog-a .notification-button").click()
        self.waitfor_text("span.tranfer-filetype-txt", "111.importTest")
        # FolderLink - Remove the imported folder
        self.fire_contextmenu(By.CSS_SELECTOR, "tr.folder span.tranfer-filetype-txt")
        self.on_visibleclick("a.dropdown-item.remove-item")
        for i in range(60):
            try:
                if re.search(r"^Are you sure that you want to move [\s\S]* to the rubbish bin[\s\S]$", driver.find_element_by_css_selector("div.fm-notification-info p").text): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        driver.find_element_by_css_selector(".fm-dialog.remove-dialog .notification-button.confirm").click()
        self.waitfor_nottext("span.tranfer-filetype-txt", "111.importTest")
        # 
        # Test: 0015  Help
        driver.find_element_by_css_selector(".top-icon.menu").click()
        self.on_visibleclick("div.top-menu-item.help")
        # wait for help to load...
        self.waitfor_text("div.section-title", "How can we help you today?")
        # check search suggestions
        driver.find_element_by_css_selector("input.search.ui-autocomplete-input").send_keys("webDAV")
        self.waitfor_text(".support-search-container .ui-front > li", "Can I upload data using FTP, SFTP, webDAV or similar?")
        self.visual_diff('help2.png')
        # check main sections
        self.assertEqual("Mobile Apps", driver.find_element_by_css_selector("#container .mobile-block").text)
        self.fire_mouseover(By.CSS_SELECTOR, "#container .mobile-block")
        self.waitfor_visibility(".block-mobile-device .iOS-mobile-block.link")
        self.assertTrue(driver.find_element_by_css_selector(".block-mobile-device .android-mobile-block.link").is_displayed())
        self.assertTrue(driver.find_element_by_css_selector(".block-mobile-device .window-mobile-block.link").is_displayed())
        self.assertEqual("Web client", driver.find_element_by_css_selector("div[data-href='#help/client/webclient']").text)
        self.assertEqual("MEGAsync", driver.find_element_by_css_selector("div[data-href='#help/client/megasync']").text)
        self.assertEqual("MEGAchat", driver.find_element_by_css_selector("div[data-href='#help/client/megachat']").text)
        # view webclient section
        driver.find_element_by_css_selector("div.block-webclient").click()
        self.waitfor_text("div.d-section-title > a", "Getting Started")
        self.fire_mouseover(By.CSS_SELECTOR, "#section-security-and-privacy > div")
        driver.find_element_by_css_selector("#section-security-and-privacy > div").click()
        self.waitfor_text("#security-and-privacy > div.d-section-title > a", "Security and Privacy")
        self.assertEqual("How does the encryption work?", driver.find_element_by_css_selector("#security-and-privacy ul.d-section-items > li > a").text)
        driver.find_element_by_css_selector("#security-and-privacy ul.d-section-items > li > a").click()
        self.waitfor_text("div.feedback-heading", "Did you find this helpful?")
        self.assertEqual("Articles", driver.find_element_by_css_selector("div.helpsection-grayheading").text)
        self.visual_diff('help2-webclient.png')
        # ensure 'Share Article' does work.
        driver.find_element_by_css_selector(".support-link-icon").click()
        self.waitfor_text(".fm-dialog.share-help .fm-dialog-title", "Share the Article")
        self.assertEqual("https://mega.nz/help/client/webclient/security-and-privacy/how-does-the-encryption-work", driver.find_element_by_css_selector(".fm-dialog.share-help input").get_attribute("value"))
        driver.find_element_by_css_selector(".fm-dialog.share-help .fm-dialog-close").click()
        # go to the support section from the help acticle
        driver.find_element_by_css_selector("div.support-email-icon").click()
        self.waitfor_text(".about-top-block h1", "Get support")
        self.visual_diff('help2-support.png')
        # try to submit the empty form, it must fail
        driver.find_element_by_css_selector(".new-bottom-pages.support .contact-new-button").click()
        self.waitfor_text(".fm-dialog.warning-dialog-a .fm-dialog-title span", "Message too short")
        # go back to the help section (browser navigation)
        driver.back()
        self.waitfor_text("div.support-article-heading", "How does the encryption work?")
        # go back to the webclient section
        driver.find_element_by_css_selector(".support-go-back.link").click()
        # try the top-search (inline overlay)
        driver.find_element_by_css_selector("div.support-search-heading").click()
        self.waitfor_text(".search-section .popular-question-title", "Frequently Asked Questions")
        self.assertEqual("How can we help you today?", driver.find_element_by_css_selector(".search-section .section-title").text)
        self.assertTrue(driver.find_element_by_css_selector(".search-section ul.popular-question-items").is_displayed())
        # close the search overlay, and check the webclient section subtitle
        driver.find_element_by_css_selector(".search-section .close-icon").click()
        self.waitfor_text(".howto-section-subtitle", "MEGA in your web browser - no installs necessary.")
        # 
        # Test: 0999  Logout
        driver.find_element_by_css_selector(".top-icon.menu").click()
        self.on_visibleclick("div.top-menu-item.logout")
        self.waitfor_invisibility(".dark-overlay")
        # 
        # Test: 1000  Ephemeral
        # Ephemeral account creation by drag&drop file upload
        driver.get(self.base_url + "#start")
        self.waitfor_visibility("#startholder .st-main-button-icon")
        driver.execute_script("""fakeDropEvent()""")
        # we were logged-in from previous tests, hence we should get a warning about logging-in instead
        self.waitfor_text(".fm-dialog.confirmation-dialog .fm-notification-warning", "\"No\" will allow you to log in and start your upload.")
        driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog .notification-button.confirm").click()
        # wait for TOS dialog and click Agree
        self.waitfor_text(".fm-dialog.bottom-pages-dialog .fm-dialog-title", "Terms of Service")
        self.visual_diff('ephemeral-tos.png')
        driver.find_element_by_css_selector(".fm-dialog.bottom-pages-dialog .fm-bp-agree").click()
        # move to the transfers panel and wait for the upload to finish
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.transfers").click()
        self.waitfor_text("tr#ul_8001 .transfer-status", "Completed")
        # on upload completion, we should get a warning about using an ephemeral session
        self.waitfor_text(".top-warning-popup .warning-header", "You are using an ephemeral session.")
        self.assertEqual("Register now", driver.find_element_by_css_selector(".top-warning-popup .warning-button span").text)
        self.visual_diff('ephemeral-transfers.png')
        # move back to the cloud and check stuff there
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.cloud-drive").click()
        self.waitfor_text("tr.file span.tranfer-filetype-txt", "testfdp.exe")
        self.assertEqual("4 B", driver.find_element_by_css_selector("tr.file td.size").text)
        self.assertEqual("Executable", driver.find_element_by_css_selector("tr.file td.type").text)
        # check the hash/checksum of the uploaded file
        self.assertEqual("MTIzNAAAAAAAAAAAAAAAAAOLqRY", self.waitfor_jsstate("M.v[0].hash"))
        # switch to other sections and check elements visibility there
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.shared-with-me").click()
        self.waitfor_text(".fm-empty-incoming .fm-empty-cloud-txt", "No Incoming Shares")
        self.assertEqual("Create Account", driver.find_element_by_css_selector(".fm-empty-incoming .fm-not-logged-button.create-account").text)
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.contacts").click()
        self.waitfor_text(".fm-empty-contacts .fm-empty-cloud-txt", "No Contacts")
        self.assertEqual("Create Account", driver.find_element_by_css_selector(".fm-empty-contacts .fm-not-logged-button.create-account").text)
        # account settings are for registered users, check ephemeral user is asked to register
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.account").click()
        self.waitfor_text(".fm-dialog.confirmation-dialog .fm-notification-warning", "Avoid losing access. Free registration is highly recommended!")
        driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog .notification-button.cancel").click()
        # logout from the ephemeral session
        driver.find_element_by_css_selector(".top-login-button").click()
        self.waitfor_text(".fm-dialog.confirmation-dialog .fm-notification-warning", "This action will delete all your data.")
        driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog .notification-button.confirm").click()
        # we should go to /login by logging out
        self.waitfor_text(".register-st2-txt-block h5.main-italic-header", "Your account is only as secure as your computer.")
        self.visual_diff('login.png')

    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException as e: return False
        return True

    def fire_contextmenu(self, how, what):
        action = ActionChains(self.driver)
        element = self.driver.find_element(by=how, value=what)
        action.move_to_element(element).context_click().perform()

    def fire_mouseover(self, how, what):
        action = ActionChains(self.driver)
        element = self.driver.find_element(by=how, value=what)
        action.move_to_element(element).perform()

    def on_visibleclick(self, selector, cnt=1):
        element = self.waitfor_clickable(selector)
        try:
            element.click()
        except:
            if cnt < 3:
                cnt += 1
                time.sleep(0.2) # delay in case of CSS animations
                self.on_visibleclick(selector, cnt)
            else: raise

    def waitfor_visibility(self, element, by=By.CSS_SELECTOR):
        return self.wait10.until(EC.visibility_of_element_located((by, element)))

    def waitfor_invisibility(self, element, by=By.CSS_SELECTOR):
        return self.wait10.until(EC.invisibility_of_element_located((by, element)))

    def waitfor_clickable(self, element, by=By.CSS_SELECTOR):
        # XXX: This doesn't mean 'clickable', but rather 'visible and enabled'!
        return self.wait30.until(EC.element_to_be_clickable((by, element)))

    def waitfor_text(self, element, text, by=By.CSS_SELECTOR):
        self.waitfor_clickable(element, by)
        return self.wait30.until(EC.text_to_be_present_in_element((by, element), text))

    def waitfor_nottext(self, element, text, by=By.CSS_SELECTOR):
        for i in range(80):
            try:
                if text != self.waitfor_visibility(element, by).text: break
            except: pass
            time.sleep(0.2)
        else: self.fail("waitfor_nottext: " + text)

    def waitfor_jsstate(self, condstate, timeout=10):
        return WebDriverWait(self.driver, timeout).until(lambda s: s.execute_script("return " + condstate))

    def abort(msg, elm=None):
        if elm is None:
            self.fail(msg)
        else:
            self.fail(msg + ", waiting for element: " + elm)

    def is_alert_present(self):
        try: self.driver.switch_to_alert()
        except NoAlertPresentException as e: return False
        return True

    def close_alert_and_get_its_text(self):
        try:
            alert = self.driver.switch_to_alert()
            alert_text = alert.text
            if self.accept_next_alert:
                alert.accept()
            else:
                alert.dismiss()
            return alert_text
        finally: self.accept_next_alert = True

    def take_screenshot(self, name, path=None, unique=True):
        now = datetime.now();
        if path is None:
            path = os.path.join(tempfile.gettempdir(), 'selenium', now.strftime("%Y%m%d"))
        if not os.path.exists(path):
            os.makedirs(path)
        if unique is True:
            name = now.strftime("%H%M%S.%f.") + name
        path = os.path.join(path, name)
        self.driver.get_screenshot_as_file(path)
        return path

    def visual_diff(self, name):
        if vdiffs is not True:
            return
        path = os.path.join(self.path, 'selenium')
        file = os.path.join(path, name)
        if os.path.exists(file):
            path = self.take_screenshot(name)
            original = Image.open(file)
            current = Image.open(path)
            diff = ImageChops.difference(original, current)
            if diff.getbbox():
                path = os.path.join(os.path.dirname(path), 'vdiff.' + name)
                diff.save(path)
                raise Exception('Visual difference found, saved to ' + path)
            os.remove(path)
        else:
            self.take_screenshot(name, path, False)

    def tearDown(self):
        if sys.exc_info()[0]:
            self.take_screenshot("error.png")
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

if __name__ == "__main__":
    # Setup the command line argument parser.
    DESCRIPTION = 'Selenium test suite for mega.nz'
    EPILOG = ('Note: You need the WebDriver for Chrome: '
              'https://sites.google.com/a/chromium.org/chromedriver/home')
    parser = argparse.ArgumentParser(description=DESCRIPTION, epilog=EPILOG)
    parser.add_argument('-u', '--username', required=True,
                        help='The username to log in as.')
    parser.add_argument('-p', '--password', required=True,
                        help='The password for the given username.')
    parser.add_argument('-b', '--baseurl', default=None,
                        help='The base url to perform the tests over.')
    parser.add_argument('-v', '--vdiffs', action='store_true',
                        help='Perform visual diff tests.')
    args, leftovers = parser.parse_known_args()

    username = args.username
    del sys.argv[1:3]
    password = args.password
    del sys.argv[1:3]
    if args.baseurl is not None:
        base_url = args.baseurl
        del sys.argv[1:3]
    if args.vdiffs:
        vdiffs = True
        del sys.argv[1:3]
    unittest.main()
