"""mega.nz tests"""

import os

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


# This file includes tests for
# login_popup - login using popup. Login button must be pressed

class CommonTests():

    def __init__(self, driver, username, password, base_url):
        self.driver = driver
        self.username = username
        self.password = password
        self.base_url = base_url
        self.verification_errors = []
        self.accept_next_alert = True
        self.wait30 = WebDriverWait(self.driver, 30)
        self.wait10 = WebDriverWait(self.driver, 10)
        self.path = os.path.dirname(os.path.realpath(__file__))

    def login_popup(self):
        """login_popup - login using popup"""
        print 'start: ' + self.login_popup.__doc__

        self.waitfor_visibility(".bottom-menu.social > a.st-bottom-button.st-facebook-button")
        # self.waitfor_visibility("div.st-social-block > a.st-bottom-button.st-facebook-button")
        # self.visual_diff('homepage.png')
        # self.driver.execute_script("""localStorage.testChatDisabled=1""")
        self.driver.find_element_by_link_text("Login").click()
        self.driver.find_element_by_id("login-name").clear()
        self.driver.find_element_by_id("login-name").send_keys(self.username)
        self.driver.find_element_by_id("login-password").clear()
        self.driver.find_element_by_id("login-password").send_keys(self.password)
        self.driver.find_element_by_css_selector(".top-head .top-dialog-login-button").click()
        self.waitfor_text(".loading-info li.step3.loading", "Decrypting")
        self.waitfor_invisibility(".loading-info li.loading")
        self.waitfor_text(".fm-file-upload span", "File Upload")

        print 'end: ' + self.login_popup.__doc__
    # Finished login function

    # def function_name(self, driver, username, password):
    #     """function_name - function description"""
    #     print 'start: ' + function_name.__doc__

    #     print 'end: ' + function_name.__doc__
    # Finished function_name function

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
