#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Selenium test runner.

You need a mega.nz account to run the tests, and that account should have a
single (and small) file on it. Ideally, create a new account and upload a
file of 1KB just for these tests, and don't do anything else on it.
Run this script with the --help flag for further details.

Requirements:
    - Selenium Python Webdriver: pip.exe install -U selenium
    - WebDriver for Chrome: https://sites.google.com/a/chromium.org/chromedriver/home

This test runner will work with both Python 2.7 as well as 3.x.
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import NoAlertPresentException
import unittest, time, re, sys, argparse

username=None
password=None
base_url="https://eu.static.mega.co.nz/3/"

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
#        0011  Blog
#        0013  Filelink
#        0014  Folderlink
#        0999  Logout

class MegaTest(unittest.TestCase):
    def setUp(self):
        chrome_options = Options()
        chrome_options.add_argument("--lang=en")
        chrome_options.add_argument("--window-size=1277,744")
        self.driver = webdriver.Chrome(chrome_options=chrome_options)
        self.driver.implicitly_wait(10)
        self.base_url = base_url
        self.verificationErrors = []
        self.accept_next_alert = True

    def test_suite(self):
        driver = self.driver
        driver.get(self.base_url + "/")
        #
        # Test: 0001  Login
        for i in range(60):
            try:
                if self.is_element_present(By.CSS_SELECTOR, "div.st-social-block > a.st-bottom-button.st-facebook-button"): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out")
        driver.find_element_by_link_text("Login").click()
        driver.find_element_by_id("login-name").clear()
        driver.find_element_by_id("login-name").send_keys(username)
        driver.find_element_by_id("login-password").clear()
        driver.find_element_by_id("login-password").send_keys(password)
        driver.find_element_by_css_selector("div.top-dialog-login-button > span").click()
        for i in range(60):
            try:
                if "File Upload" == driver.find_element_by_css_selector(".fm-file-upload span").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out")
        # 
        # Test: 0002  New Folder
        # Create new folder
        driver.find_element_by_css_selector("div.fm-new-folder").click()
        driver.find_element_by_css_selector("div.create-folder-input-bl > input[type=\"text\"]").click()
        driver.find_element_by_css_selector("div.create-folder-input-bl > input[type=\"text\"]").clear()
        driver.find_element_by_css_selector("div.create-folder-input-bl > input[type=\"text\"]").send_keys("000.foldertest")
        driver.find_element_by_css_selector("div.create-folder-button > span").click()
        for i in range(60):
            try:
                if "000.foldertest" == driver.find_element_by_css_selector("span.tranfer-filetype-txt").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0002  New Folder")
        # Remove the created folder
        self.fire_contextmenu(By.CSS_SELECTOR, "tr.folder span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.remove-item")
        for i in range(60):
            try:
                if re.search(r"^Are you sure that you want to move [\s\S]* to the rubbish bin[\s\S]$", driver.find_element_by_css_selector("div.fm-notification-info p").text): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0002  New Folder")
        driver.find_element_by_css_selector(".fm-dialog-button.notification-button.confirm").click()
        self.assertNotEqual("000.foldertest", driver.find_element_by_css_selector("span.tranfer-filetype-txt").text)
        # 
        # Test: 0004  Empty Rubbish
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.rubbish-bin").click()
        driver.find_element_by_css_selector("div.fm-clearbin-button").click()
        for i in range(60):
            try:
                if "You cannot undo this action." == driver.find_element_by_css_selector(".fm-notification-warning").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0004  Empty Rubbish")
        driver.find_element_by_css_selector(".fm-dialog-button.notification-button.confirm").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-empty-trashbin .fm-empty-cloud-txt").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0004  Empty Rubbish")
        # 
        # Test: 0004  Reload
        driver.find_element_by_link_text("Menu").click()
        driver.find_element_by_css_selector("div.top-menu-item.refresh-item").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector("div.fm-notification-warning").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0004  Reload")
        self.assertRegexpMatches(driver.find_element_by_css_selector("div.fm-notification-warning").text, r"^Are you sure you want to continue[\s\S]$")
        driver.find_element_by_css_selector(".fm-dialog-button.notification-button.confirm").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".light-overlay, .st-social-block-load").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0004  Reload")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-empty-trashbin .fm-empty-cloud-txt").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0004  Reload")
        # 
        # Test: 0005  Switch Sections
        # Switch to Contacts section and check that some elements are there...
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.contacts").click()
        driver.find_element_by_css_selector("div.fm-add-user > span").click()
        self.assertEqual("Import Contacts...", driver.find_element_by_css_selector("div.import-contacts-link").text)
        driver.find_element_by_css_selector("div.add-user-size-icon.full-size").click()
        driver.find_element_by_css_selector("div.import-contacts-link").click()
        for i in range(60):
            try:
                if "Gmail" == driver.find_element_by_css_selector(".import-contacts-service.gmail").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0005  Switch Sections")
        driver.find_element_by_css_selector("div.add-user-popup.dialog > div.fm-dialog-close").click()
        self.assertEqual("View received requests", driver.find_element_by_css_selector("div.fm-received-requests").text)
        self.assertEqual("View sent requests", driver.find_element_by_css_selector("div.fm-contact-requests").text)
        # Switch to 'Shared with me' section
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.shared-with-me").click()
        self.assertTrue(self.is_element_present(By.CSS_SELECTOR, "span.right-arrow-bg.ui-draggable"))
        self.assertEqual("My incoming shares", driver.find_element_by_css_selector("div.nw-tree-panel-header > span").text)
        driver.find_element_by_css_selector("div.nw-tree-panel-arrows").click()
        self.assertEqual("Ascending", driver.find_element_by_css_selector(".nw-sorting-menu > .context-menu-section > .sorting-menu-item[data-dir='1']").text)
        # Switch back to Cloud
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.cloud-drive").click()
        driver.find_element_by_css_selector("a.fm-files-view-icon.block-view").click()
        self.fire_contextmenu(By.CSS_SELECTOR, "span.block-view-file-type")
        self.on_visibleclick("a.context-menu-item.properties-item")
        self.assertEqual("Created:", driver.find_element_by_css_selector("div.properties-float-bl > div.properties-small-gray").text)
        driver.find_element_by_css_selector(".fm-dialog.properties-dialog .fm-dialog-close").click()
        driver.find_element_by_css_selector("a.fm-files-view-icon.listing-view").click()
        for i in range(60):
            try:
                if 1 == len(driver.find_elements_by_xpath("//span[@class='tranfer-filetype-txt']")): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0005  Switch Sections")
        # 
        # Test: 0006  Context Actions
        # Favourite
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.add-star-item")
        self.assertTrue(self.is_element_present(By.CSS_SELECTOR, "span.grid-status-icon.star"))
        # Remove Favourite
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.add-star-item")
        # Get link
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.getlink-item")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector("div.copyrights-dialog-head").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        self.assertEqual("Copyright warning to all users", driver.find_element_by_css_selector("div.copyrights-dialog-head").text)
        driver.find_element_by_css_selector(".fm-dialog.copyrights-dialog .fm-dialog-button.accept").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-dialog.export-links-dialog .fm-dialog-title").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        self.assertEqual("Export file links and decryption keys", driver.find_element_by_css_selector(".fm-dialog.export-links-dialog .fm-dialog-title").text)
        self.assertEqual("Link with key", driver.find_element_by_css_selector("div.link-handle-and-key span.text").text)
        driver.find_element_by_css_selector("div.link-handle-and-key").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".file-link-info-wrapper .file-link-info.key").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        driver.find_element_by_css_selector(".fm-dialog.export-links-dialog .fm-dialog-close").click()
        # Remove Link
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.removelink-item")
        for i in range(60):
            try:
                if not driver.find_element_by_css_selector(".dark-overlay").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        # Rename
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.rename-item")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-dialog.rename-dialog").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        oldName = driver.find_element_by_css_selector("span.tranfer-filetype-txt").text
        newName = "zzzz"
        driver.find_element_by_name("dialog-rename").clear()
        driver.find_element_by_name("dialog-rename").send_keys(newName)
        driver.find_element_by_css_selector(".rename-dialog-button.rename").click()
        for i in range(60):
            try:
                if newName == driver.find_element_by_css_selector("span.tranfer-filetype-txt").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        # Rename Back
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.rename-item")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-dialog.rename-dialog").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        driver.find_element_by_name("dialog-rename").clear()
        driver.find_element_by_name("dialog-rename").send_keys(oldName)
        driver.find_element_by_css_selector(".rename-dialog-button.rename").click()
        for i in range(60):
            try:
                if oldName == driver.find_element_by_css_selector("span.tranfer-filetype-txt").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        # Copy
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.copy-item")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-dialog.copy-dialog").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        self.assertEqual("My folders", driver.find_element_by_css_selector(".copy-dialog-panel-header span").text)
        driver.find_element_by_css_selector(".fm-dialog-button.dialog-copy-button").click()
        for i in range(60):
            try:
                if 2 == len(driver.find_elements_by_xpath("//span[@class='tranfer-filetype-txt']")): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        # Move
        self.fire_contextmenu(By.CSS_SELECTOR, "span.tranfer-filetype-txt")
        self.fire_mouseover(By.CSS_SELECTOR, "a.context-menu-item.move-item.contains-submenu")
        self.on_visibleclick("span.context-submenu .context-menu-item.remove-item")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-dialog.confirmation-dialog.remove-dialog").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        driver.find_element_by_css_selector(".fm-dialog-button.notification-button.confirm").click()
        for i in range(60):
            try:
                if 1 == len(driver.find_elements_by_xpath("//span[@class='tranfer-filetype-txt']")): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0006  Context Actions")
        # 
        # Test: 0007  Settings
        driver.find_element_by_css_selector(".fm-main.default .nw-fm-left-icon.account").click()
        # Overview
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-account-blocks.storage .fm-account-header").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        self.assertEqual("Edit your profile", driver.find_element_by_css_selector(".fm-account-info-block .default-button.editprofile > span").text)
        self.assertEqual("Backup Recovery Key", driver.find_element_by_css_selector(".fm-account-info-block .default-button.backup-master-key > span").text)
        self.assertEqual("Cancel your account", driver.find_element_by_css_selector(".fm-account-info-block .default-button.cancel-account > span").text)
        driver.find_element_by_css_selector(".fm-account-info-block .default-button.editprofile > span").click()
        # Profile
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-account-blocks.profile-form .fm-account-header").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        oldName = driver.find_element_by_id("account-firstname").get_attribute("value")
        driver.find_element_by_id("account-firstname").clear()
        driver.find_element_by_id("account-firstname").send_keys("")
        driver.find_element_by_id("account-firstname").send_keys(u"ñ")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-account-save-block").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        driver.find_element_by_css_selector(".fm-account-save-block .fm-account-save").click()
        for i in range(60):
            try:
                if u"ñ" == driver.find_element_by_css_selector(".user-name").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        driver.find_element_by_id("account-firstname").clear()
        driver.find_element_by_id("account-firstname").send_keys("")
        driver.find_element_by_id("account-firstname").send_keys(oldName)
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-account-save-block").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        driver.find_element_by_css_selector(".fm-account-save-block .fm-account-save").click()
        for i in range(60):
            try:
                if oldName == driver.find_element_by_css_selector(".user-name").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        # History
        driver.find_element_by_css_selector(".fm-account-button.history").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-account-history-head .fm-account-header.left").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        driver.find_element_by_css_selector(".account-history-dropdown-button.sessions").click()
        driver.find_element_by_css_selector("div.account-history-drop-items.session100-").click()
        for i in range(60):
            try:
                if not driver.find_element_by_css_selector(".dark-overlay").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        # Settings
        driver.find_element_by_css_selector(".fm-account-button.settings").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-account-settings.fm-account-sections").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0007  Settings")
        self.fire_mouseover(By.ID, "rad12")
        driver.find_element_by_id("rad12").click()
        # 
        # Test: 0011  Blog
        driver.find_element_by_link_text("Menu").click()
        driver.find_element_by_css_selector("div.top-menu-item.megablog").click()
        for i in range(60):
            try:
                if not driver.find_element_by_css_selector(".dark-overlay").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0011  Blog")
        self.assertEqual("Archive", driver.find_element_by_css_selector("h1").text)
        self.assertTrue(driver.find_element_by_css_selector("div.blog-new-item").is_displayed())
        driver.find_element_by_link_text("Read more").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".blog-new-full").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0011  Blog")
        self.assertTrue(driver.find_element_by_id("blogarticle_title").is_displayed())
        # 
        # Test: 0013  Filelink
        # FileLink - Visit TakenDown file
        driver.get(self.base_url + "#!okESgTYL!2DQn0aszTUeR8Xo-FiCY9SGyEBlQSGryKAGoaMFFZpw")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector("div.download.error-title").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0013  Filelink")
        self.assertEqual("The file you are trying to download is no longer available.", driver.find_element_by_css_selector("div.download.error-title").text)
        self.assertFalse(driver.find_element_by_css_selector(".download-button.to-clouddrive").is_displayed())
        # FileLink - Download
        driver.get(self.base_url + "#!84Vl0ADI!Fj9EOhlQu4mN_ZwlUNIHCD6xc2xMKCEjSFvEEvypx9o")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".download-button.throught-browser").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0013  Filelink")
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
        # 
        # Test: 0014  Folderlink
        driver.get(self.base_url + "#F!9sUAGZ4R!moe6GANiPRawdt3ZUFLp4g")
        driver.refresh()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".nw-fm-tree-header.folder-link").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        self.assertEqual("111.importTest", driver.find_element_by_css_selector("div.nw-tree-panel-header span").text)
        self.assertEqual("Download as ZIP", driver.find_element_by_css_selector(".fm-download-as-zip span").text)
        self.assertEqual("Import to my cloud drive", driver.find_element_by_css_selector(".fm-import-to-cloudrive span").text)
        # FolderLink - Download as ZIP
        driver.find_element_by_css_selector(".fm-download-as-zip").click()
        driver.find_element_by_css_selector(".fm-main.default.active-folder-link .nw-fm-left-icon.transfers").click()
        for i in range(60):
            try:
                if "Completed" == driver.find_element_by_css_selector("tr#zip_1 .transfer-status").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        driver.find_element_by_css_selector(".fm-main.default.active-folder-link .nw-fm-left-icon.folder-link").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".nw-fm-tree-header.folder-link").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        # FolderLink - Import to Cloud Drive
        self.fire_contextmenu(By.CSS_SELECTOR, ".fm-main.default.active-folder-link .nw-fm-left-icon.folder-link")
        self.on_visibleclick("a.context-menu-item.import-item")
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-dialog.copy-dialog").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        self.assertEqual("Import", driver.find_element_by_css_selector(".fm-dialog-button.dialog-copy-button span").text)
        driver.find_element_by_css_selector(".fm-dialog-button.dialog-copy-button").click()
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(".fm-dialog.warning-dialog-a").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        self.assertRegexpMatches(driver.find_element_by_css_selector(".fm-dialog.warning-dialog-a .fm-notification-info").text, r"^[\s\S]*successfully imported\.$")
        driver.find_element_by_css_selector(".fm-dialog-button.notification-button").click()
        for i in range(60):
            try:
                if "111.importTest" == driver.find_element_by_css_selector("span.tranfer-filetype-txt").text: break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        # FolderLink - Remove the imported folder
        self.fire_contextmenu(By.CSS_SELECTOR, "tr.folder span.tranfer-filetype-txt")
        self.on_visibleclick("a.context-menu-item.remove-item")
        for i in range(60):
            try:
                if re.search(r"^Are you sure that you want to move [\s\S]* to the rubbish bin[\s\S]$", driver.find_element_by_css_selector("div.fm-notification-info p").text): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0014  Folderlink")
        driver.find_element_by_css_selector(".fm-dialog-button.notification-button.confirm").click()
        self.assertNotEqual("111.importTest", driver.find_element_by_css_selector("span.tranfer-filetype-txt").text)
        # 
        # Test: 0999  Logout
        driver.find_element_by_link_text("Menu").click()
        driver.find_element_by_css_selector("div.top-menu-item.logout").click()
        for i in range(60):
            try:
                if not driver.find_element_by_css_selector(".dark-overlay").is_displayed(): break
            except: pass
            time.sleep(0.3)
        else: self.fail("time out: 0999  Logout")

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

    def on_visibleclick(self, selector):
        driver = self.driver
        for i in range(60):
            try:
                if driver.find_element_by_css_selector(selector).is_displayed(): break
            except: pass
            time.sleep(0.4)
        else: self.abort("time out", selector)
        driver.find_element_by_css_selector(selector).click()

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

    def tearDown(self):
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
    args, leftovers = parser.parse_known_args()

    username = args.username
    del sys.argv[1:3]
    password = args.password
    del sys.argv[1:3]
    if args.baseurl is not None:
        base_url = args.baseurl
        del sys.argv[1:3]
    unittest.main()
