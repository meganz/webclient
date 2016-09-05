var __help2_templates = {};
__help2_templates.gallery = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "<div class=\"";
  out += escapeHTML(data.landscape ? "support-image-container" : "mobile-support-image-container");
  out += " container\">\n    <div class=\"";
  out += escapeHTML(data.landscape ? "support-images-gallery" : "mobile-support-images-gallery");
  out += " photos\">\n        ";
  data.photos.forEach(function(photo, i) {
    out += "\n            <img src=\"{cmspath}/unsigned/";
    out += escapeHTML(photo[1]);
    out += "\" alt=\"\" class=\"";
    out += escapeHTML(i === 0 ? 'img-active ' : '');
    out += " img-swap photo-id-";
    out += escapeHTML(i);
    out += "\" style=\"height: ";
    out += escapeHTML(613 * (data.landscape ? 1 : .42) / photo[2] * photo[3]);
    out += "px\"/>\n        ";
  })
  out += "\n    </div>\n    <div class=\"nav-dots-container\">\n        <ul class=\"gallery-dot-navigation\">\n            ";
  data.photos.forEach(function(photo, i) {
    out += "\n            <li class=\"";
    out += CMS.html(i === 0 ? 'active-nav-dot' : 'nav-dots');
    out += " dot-";
    out += escapeHTML(i);
    out += "\" data-photo=\"";
    out += escapeHTML(i);
    out += "\"></li>\n            ";
  })
  out += "\n        </ul>\n    </div>\n    <div class=\"";
  out += escapeHTML(data.landscape ? "support-image-instructions" : "mobile-support-image-instructions");
  out += " instructions\">\n         <ul>\n            ";
  data.photos.forEach(function(photo, i) {
    out += "\n            <div class=\"bullet-number ";
    out += escapeHTML(i === 0 ? 'selected-bullet' : '');
    out += " bullet-";
    out += escapeHTML(i);
    out += "\"  data-photo=\"";
    out += escapeHTML(i);
    out += "\">";
    out += escapeHTML(i + 1);
    out += "</div>\n            <li class=\"image-instruction-control ";
    out += escapeHTML(i === 0 ? 'active-instructions' : '');
    out += " instruction-";
    out += escapeHTML(i);
    out += "\" data-photo=\"";
    out += escapeHTML(i);
    out += "\">\n                ";
    out += CMS.html(photo[0]);
    out += "\n            </li>\n            ";
  })
  out += "\n        </ul>\n    </div>\n</div>\n";
  return (out);
}

__help2_templates.client_index = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "((TOP))\n\n<div class=\"main-scroll-block\">\n   <div class=\"main-pad-block help-home-page\">\n    <div class=\"help-background-block\"></div>\n      <div class=\"main-mid-pad new-bottom-pages help2\" id=\"help2-main\">\n        ";
  out += CMS.html(tpl.goback(data));
  out += "\n        <div class=\"getstart-title-section\">\n            <div class=\"section-title\">";
  out += escapeHTML(data.title);
  out += "</div>\n            <div class=\"howto-section-subtitle\">";
  out += escapeHTML(data.subtitle);
  out += "</div>\n        </div>\n        <div class=\"search-section hidden search-section-header\">\n            <div class=\"help-background-block\"></div>\n            <div class=\"search-close\"><div class=\"close-icon\"></div><span></span></div>\n                <div class=\"section-title\">[$9095]</div>\n                <div class=\"support-search-container\">\n                    <form id=\"support-search\" action=\"\">\n                        <input class=\"submit\" type=\"submit\" value=\"\">\n                        <input class=\"search\" type=\"text\" placeholder=\"[$9105]\">\n                    </form>\n                </div>\n                <div class=\"popular-question-block\">\n                <div class=\"popular-question-title\">[$9094]</div>\n                <div class=\"popular-question-list\">\n                    <ul class=\"popular-question-items\">\n                        <li><div class=\"related-bullet-point\"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti..</a></li>\n                        <li><div class=\"related-bullet-point\"></div><a>Justo vitae ipsum amet non</a></li>\n                        <li><div class=\"related-bullet-point\"></div><a>Mauris ullamcorper nec id libero, semper aenean in neque</a></li>\n                        <li><div class=\"related-bullet-point\"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti, in diam.</a></li>\n                    </ul>\n                </div>\n                <div class=\"popular-question-list\">\n                    <ul class=\"popular-question-items\">\n                        <li><div class=\"related-bullet-point\"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti..</a></li>\n                        <li><div class=\"related-bullet-point\"></div><a>Justo vitae ipsum amet non</a></li>\n                        <li><div class=\"related-bullet-point\"></div><a>Mauris ullamcorper nec id libero, semper aenean in neque</a></li>\n                        <li><div class=\"related-bullet-point\"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti, in diam.</a></li>\n                    </ul>\n                </div>\n            </div>\n        </div>\n        <div id=\"container\" class=\"\">\n            ";
  if (!data.is_mobile) {
    out += "\n            <div class=\"block link\" data-href=\"";
    out += escapeHTML(url(data.prefix || "client", "mobile"));
    out += "\">\n                <div class=\"block-mobile\"></div>\n                Mobile\n            </div>\n            ";
  }
  out += "\n            ";
  clients.forEach(function(client) {
    out += "\n                ";
    if (!data.is_mobile && client.tags.indexOf("mobile") !== -1) return;
    out += "\n                ";
    if (data.is_mobile && client.tags.indexOf("mobile") === -1) return;
    out += "\n            <div class=\"block link\" data-href=\"";
    out += escapeHTML(url(data.prefix || "client", client.url));
    out += "\">\n                <div class=\"block-";
    out += escapeHTML(client.big_icon || client.url);
    out += "\"></div>\n                ";
    out += escapeHTML(client.name);
    out += "\n            </div>\n            ";
  })
  out += "\n        </div>\n      </div> \n      ((BOTTOM))\n   </div>\n</div>\n\n";
  return (out);
}

__help2_templates.clients = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  if (typeof data.client === "object" && data.show_devices || data.is_mobile) {
    out += "\n<div class=\"sidebar-device-container\">\n    <div class=\"helpsection-grayheading\">Platform</div>\n    <div class=\"device-container-hover\">\n        <div class=\"device-selector-top\">\n            ";
    sortClients(data.client, clients).forEach(function(client, id) {
      out += "\n            ";
      if (client.tags.indexOf("not a client") !== -1) return
      out += "\n            <div class=\"device-select device-";
      out += escapeHTML(client.url);
      out += " link\" data-href=\"";
      out += escapeHTML(location.hash.replace(data.client.url, client.url));
      out += "\">\n                <div class=\"device-icon ";
      out += escapeHTML(client.icon || client.url);
      out += "-icon\"></div>\n                <span>";
      out += escapeHTML(client.name);
      out += "</span>\n                ";
      if (id === 0) {
        out += "\n                <div class=\"device-menu-icon\"></div>\n                ";
      }
      out += "\n            </div>\n            ";
    });
    out += "\n        </div>\n    </div>\n    <div class=\"device-selector\">\n        <div class=\"device-icon ";
    out += escapeHTML(data.client.icon || data.client.url);
    out += "-icon\"></div>\n        <span>";
    out += escapeHTML(data.client.name);
    out += "</span>\n        <div class=\"device-menu-icon\"></div>\n    </div>\n</div>\n";
  }
  out += "\n";
  return (out);
}

__help2_templates.goback = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "<div class=\"support-section-header\">\n    <div class=\"support-go-back\">\n        <div class=\"support-go-back-icon\"></div>\n        <div class=\"support-go-back-heading\">[$9096]</div>\n    </div> \n    ";
  if ((data || {}).search !== false) {
    out += "\n    <div class=\"support-search\" href=\"#searchbar\">\n        <div class=\"support-search-heading\">[$102]</div>\n        <div class=\"support-search-heading-close hidden\">[$148]</div>\n        <div class=\"support-search-icon\"></div>\n    </div>\n    ";
  }
  out += "\n</div>\n<div class=\"support-section-header-clone\">\n    <div class=\"support-go-back\">\n        <div class=\"support-go-back-icon\"></div>\n        <div class=\"support-go-back-heading\">[$9096]</div>\n    </div> \n</div>\n<div class=\"clear\"></div>\n";
  out += CMS.html(tpl.goback_js(data) || "");
  out += "\n";
  return (out);
}

__help2_templates.header = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "<div class=\"main-title-section\">\n    ";
  if (data.title) {
    out += "\n    <div class=\"section-title\">\n        ";
    out += escapeHTML(data.title);
    out += "\n    </div>\n    ";
  }
  out += "\n    ";
  if (typeof data.subtitle !== 'undefined') {
    out += "\n    <div class=\"howto-section-subtitle\">\n        ";
    out += escapeHTML(data.subtitle);
    out += "\n    </div>\n    ";
  }
  out += "\n</div>\n\n<div class=\"search-section hidden search-section-header\">\n    <div class=\"help-background-block\"></div>\n    <div class=\"search-close\"><div class=\"close-icon\"></div><span></span></div>\n    <div class=\"section-title\">[$9095]</div>\n    <div class=\"support-search-container\">\n        <form id=\"support-search\" action=\"\">\n            <input class=\"submit\" type=\"submit\" value=\"\">\n            <input class=\"search\" type=\"text\" placeholder=\"[$9105]\">\n        </form>\n    </div>\n    <div class=\"popular-question-block\">\n        <div class=\"popular-question-title\">[$9094]</div>\n        <div class=\"popular-question-list\">\n            <ul class=\"popular-question-items\">\n                ";
  popularQuestions.forEach(function(rel, id) {
    if (++id % 2 == 0) return;
    out += "\n                <li><div class=\"related-bullet-point\"></div><a href=\"";
    out += escapeHTML(rel.full_url);
    out += "\"><span class=\"client-name\">";
    out += escapeHTML(rel.client.name);
    out += "</span> ";
    out += escapeHTML(rel.question);
    out += "</a></li>\n                ";
  })
  out += "\n            </ul>\n        </div>\n        <div class=\"popular-question-list\">\n            <ul class=\"popular-question-items\">\n                ";
  popularQuestions.forEach(function(rel, id) {
    if (++id % 2 == 1) return;
    out += "\n                <li><div class=\"related-bullet-point\"></div><a href=\"";
    out += escapeHTML(rel.full_url);
    out += "\"><span class=\"client-name\">";
    out += escapeHTML(rel.client.name);
    out += "</span> ";
    out += escapeHTML(rel.question);
    out += "</a></li>\n                ";
  })
  out += "\n            </ul>\n        </div>\n    </div>\n</div>\n";
  return (out);
}

__help2_templates.listing = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "((TOP))\n\n<div class=\"main-scroll-block\">\n    <div class=\"main-pad-block help-home-page\">\n        <div class=\"help-background-block\"></div>\n        <div class=\"main-mid-pad new-bottom-pages help2\" id=\"help2-main\">\n            ";
  out += CMS.html(tpl.goback(data));
  out += "\n            <div class=\"main-pad-container\">\n                ";
  out += CMS.html(tpl.header(data));
  out += "\n                <div class=\"sidebar-menu-container\">\n                    ";
  out += CMS.html(tpl.clients(data));
  out += "\n\n                    <div class=\"sidebar-menu-slider directory\">\n                        <div class=\"helpsection-grayheading\">[$9097]</div>\n                        ";
  data.section.questions.forEach(function(question) {
    out += "\n                        <a class=\"sidebar-menu-link scrollTo\" data-to=\"#";
    out += escapeHTML(question.url);
    out += "\"\n                           id=\"section-";
    out += escapeHTML(question.url);
    out += "\" data-state=\"";
    out += escapeHTML(data.base_url + "/" + question.url);
    out += "\">\n                           <div>";
    out += escapeHTML(question.question);
    out += "</div>\n                        </a>\n                        ";
  })
  out += "\n                    </div>\n\n                    <div class=\"sidebar-sort-container hidden\">\n                        <div class=\"helpsection-grayheading\">SORT BY</div>\n                        <ul class=\"sortby-items\">\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio checked\">\n                                    <input class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Most Views</span>\n                            </li>\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio\">\n                                    <input class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Most Relevant</span>\n                            </li>\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio\">\n                                    <input class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Date Modified</span>\n                            </li>\n                        </ul>\n                    </div>\n                </div>\n\n                <div class=\"support-info-container\">\n                    <div class=\"main-content-pad\">\n\n                        ";
  data.section.questions.forEach(function(question) {
    out += "\n                        <div class=\"support-article content-by-tags  updateSelected\"  data-update=\"#section-";
    out += escapeHTML(question.url);
    out += "\" id=\"";
    out += escapeHTML(question.url);
    out += "\" data-tags=\"";
    out += escapeHTML(JSON.stringify(question.tags.map(function(w) {
      return tagUri(w)
    })));
    out += "\">\n                            <div class=\"support-article-heading\">";
    out += escapeHTML(question.question);
    out += "</div>\n                            <div class=\"support-article-infobar\">\n                                <div class=\"support-viewcount hidden\">VIEWS<div class=\"support-viewcount-result\">1023</div></div>\n                                <div class=\"support-updatedate\">Updated<div class=\"support-updatedate-result\">";
    out += escapeHTML(humandate(question.created));
    out += "</div></div>\n                                <div class=\"support-interaction\">\n                                    <div class=\"support-link-icon\"></div>\n                                    <div class=\"support-email-icon\"></div>\n                                </div>\n                            </div>\n                            <div class=\"clear\"></div>\n                            <div class=\"support-article-info\">\n                                ";
    out += CMS.html(galleryHtml(question.answer, question.galleries));
    out += "\n                            </div>\n                            <div class=\"related-and-tags-container\">\n                                ";
    if (question.related.length > 0) {
      out += "\n                                <div class=\"related-articles\">\n                                    <div class=\"related-articles-title\">Related Articles</div>\n                                    <div class=\"clear\"></div>\n                                    <ul class=\"related-articles-list\">\n                                        ";
      question.related.forEach(function(rel) {
        rel = data.articlesById[rel];
        out += "\n                                        <li><div class=\"related-bullet-point\"></div><a href=\"";
        out += escapeHTML(rel.full_url);
        out += "\"><span class=\"client-name\">";
        out += escapeHTML(rel.client.name);
        out += "</span> ";
        out += escapeHTML(rel.question);
        out += "</a></li>\n                                        ";
      })
      out += "\n                                    </ul>\n                                </div>\n                                ";
    }
    out += "\n                                ";
    if (question.tags.length > 0) {
      out += "\n                                <div class=\"related-tags hidden\">\n                                    <div class=\"related-tags-title\">\n                                        Related Tags\n                                    </div>\n                                    <div class=\"clear\"></div>\n                                    <div class=\"related-tags-list\">\n                                        ";
      question.tags.forEach(function(tag) {
        out += "\n                                        <div class=\"support-tag tag-";
        out += escapeHTML(tagUri(tag));
        out += "\" data-tag=\"";
        out += escapeHTML(tagUri(tag));
        out += "\">";
        out += escapeHTML(tag);
        out += "</div>\n                                        ";
      })
      out += "\n                                    </div>\n                                </div>\n                                ";
    }
    out += "\n                            </div>\n                            <div class=\"clear\"></div>\n                            <div class=\"article-feedback-container\">\n                                <div class=\"feedback-heading\">\n                                    <div class=\"feedback-logo\"></div>\n                                    <p>Did you find this helpful?</p>\n                                </div>\n                                <div class=\"feedback-buttons\">\n                                    <div class=\"feedback-yes\" data-hash=\"";
    out += escapeHTML(question.up);
    out += "\">\n                                        <div>Yes</div>\n                                        <div class=\"yes-icon icon\"></div>\n                                    </div>\n                                    <div class=\"feedback-no\" data-hash=\"";
    out += escapeHTML(question.down);
    out += "\">\n                                        <div>No</div>\n                                        <div class=\"no-icon icon\"></div>\n                                    </div>\n                                </div>\n                                <div class=\"feedback-suggestions-list\">\n                                    <div class=\"feedback-suggestions-title\">\n                                        We're sorry you didn't find this helpful. What can we do to improve it?\n                                    </div>\n                                    <ul>\n                                        <li class=\"adv-search-selected checked\">\n                                            <div class=\"adv-search-radio\">\n                                                <input type=\"radio\" value=\"dont-understand-answer\" name=\"feedback-radio\" checked=\"checked\">\n                                                <div></div>\n                                            </div>\n                                            <span>I don't understand the answer.</span>\n                                        </li>\n                                        <li class=\"adv-search-selected\">\n                                            <div class=\"adv-search-radio\">\n                                                <input type=\"radio\" value=\"dont-speak-english\" name=\"feedback-radio\">\n                                                <div></div>\n                                            </div>\n                                            <span>I don't speak English.</span>\n                                        </li>\n                                        <li class=\"adv-search-selected\">\n                                            <div class=\"adv-search-radio\">\n                                                <input type=\"radio\" value=\"out-of-date\" name=\"feedback-radio\">\n                                                <div></div>\n                                            </div>\n                                            <span>This is out of date.</span>\n                                        </li>\n                                        <li class=\"adv-search-selected\">\n                                            <div class=\"adv-search-radio\">\n                                                <input type=\"radio\" value=\"images-not-correct\" name=\"feedback-radio\">\n                                                <div></div>\n                                            </div>\n                                            <span>The images are not correct.</span>\n                                        </li>\n                                    </ul>\n                                    <textarea name=\"text\" class=\"feedback-suggestion-form\" rows=\"4\" placeholder=\"Enter here...\"></textarea> \n                                    <div class=\"feedback-send\">Send</div>\n                                </div>\n                            </div>\n                            <div class=\"article-end\"></div>\n                        </div>\n                        ";
  })
  out += "\n                    </div>\n                </div>\n            </div>\n        </div> \n        ((BOTTOM))\n    </div>\n</div>\n\n";
  return (out);
}

__help2_templates.search = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "((TOP))\n\n<div class=\"main-scroll-block\">\n    <div class=\"main-pad-block help-home-page\">\n        <div class=\"help-background-block\"></div>\n        <div class=\"main-mid-pad new-bottom-pages help2\" id=\"help2-main\">\n\n            <div class=\"search-section\">\n                ";
  out += CMS.html(tpl.goback({
    search: false,
    previous_url: data.previous_url
  }));
  out += "\n                <div class=\"section-title\">\n                    How can we help you today?\n                </div>\n                <div class=\"support-search-container\">\n                    <form id=\"support-search\" action=\"\">\n                        <input class=\"submit\" type=\"submit\" value=\"\">\n                        <input class=\"search\" type=\"text\" placeholder=\"[$9105]\" value=\"";
  out += escapeHTML(data.search || "");
  out += "\">\n                    </form>\n                </div>\n                <div class=\"mobile-search-block\">\n                    <div class=\"mobile-search-filters\">\n                        <ul class=\"mobile-search-list\">\n                            <li class=\"filter-selected\">Device</li>\n                            <li>Sort By</li>\n                            <li>Tags</li>\n                            <li>Reset All</li>\n                        </ul>\n                    </div>\n                    <div class=\"sidebar-tags-container\">\n                        <div class=\"support-tag\">Subscription 12</div>\n                        <div class=\"support-tag\">alphacentauri 09</div>\n                        <div class=\"support-tag\">galacti 06</div>\n                        <div class=\"support-tag\">ISIS 12</div>\n                        <div class=\"support-tag\">prawnsonson 12</div>\n                        <div class=\"support-tag\">alphacentauri 09</div>\n                        <div class=\"support-tag\">galacti 06</div>\n                        <div class=\"support-tag\">ISIS 12</div>\n                        <div class=\"support-tag\">prawnsonson 12</div>\n                        <div class=\"support-tag\">Subscription 12</div>\n                        <div class=\"support-tag\">alphacentauri 09</div>\n                    </div>\n\n                    <div class=\"sidebar-sort-container\">\n                        <ul class=\"sortby-items\">\n                            <!--\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Most Views</span>\n                            </li>\n                            -->\n                            <li class=\"adv-search-selected checked\">\n                                <div class=\"adv-search-radio\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Most Relevant</span>\n                            </li>\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Date Modified</span>\n                            </li>\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Least Views</span>\n                            </li>\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Least Relevant</span>\n                            </li>\n                        </ul>\n                    </div>\n                </div>\n                ";
  if (data.articles.length > 0) {
    out += "\n                <div class=\"sidebar-menu-container\">\n                    ";
    if (data.articles.length > 0 && false) {
      out += "\n                    ";
      out += CMS.html(tpl.clients(data));
      out += "\n                    <div class=\"sidebar-sort-container\">\n                        <div class=\"helpsection-grayheading\">SORT BY</div>\n                        <ul class=\"sortby-items\">\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio checked\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Most Views</span>\n                            </li>\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio checked\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Most Relevant</span>\n                            </li>\n                            <li class=\"adv-search-selected\">\n                                <div class=\"adv-search-radio\">\n                                    <input  class=\"checked\" type=\"radio\" value=\"voucher\" name=\"voucher\" checked=\"checked\">\n                                    <div></div>\n                                </div>\n                                <span>Date Modified</span>\n                            </li>\n                        </ul>\n                    </div>\n                    ";
    }
    out += "\n                    ";
    out += CMS.html(tpl.sidebar_tags({
      tags: data.articles,
      hasResult: data.hasResult
    }));
    out += "\n                </div>\n                ";
  }
  out += "\n\n                <div class=\"support-info-container \">\n                    ";
  if (!data.hasResult) {
    out += "\n                    <div class=\"search-404-block\">\n                        <div class=\"search-error-heading\">[$9098]</div>\n                        <div class=\"search-error-subheading\">[$9099]</div>\n                        <div class=\"email-button link\" data-href=\"#support\">\n                            <span>[$9100]</span>\n                        </div>\n                    </div>\n                    ";
  } else {
    out += "\n                    <div class=\"main-search-pad\">\n                        ";
    data.articles.forEach(function(result) {
      out += "\n                        <div class=\"search-result link content-by-tags\" data-href=\"";
      out += escapeHTML(result.url);
      out += "\" data-tags=\"";
      out += escapeHTML(JSON.stringify(result.tags.map(function(w) {
        return tagUri(w)
      })));
      out += "\">\n                            <div class=\"search-result-title\">\n                                ";
      out += escapeHTML(result.title);
      out += "\n                            </div>\n                            <div class=\"search-result-content\">";
      out += escapeHTML(result.body);
      out += "</div>\n                            <div class=\"search-result-footer\">\n                                <div class=\"search-result-filter\">\n                                    <div class=\"result-filter-icon\"></div>\n                                    <div class=\"result-filter-result\">";
      out += escapeHTML(result.ups);
      out += "</div>\n                                </div>\n                                ";
      result.tags.forEach(function(tag) {
        out += "\n                                <div class=\"support-tag tag-";
        out += escapeHTML(tagUri(tag));
        out += "\" data-tag=\"";
        out += escapeHTML(tagUri(tag));
        out += "\">";
        out += escapeHTML(tag);
        out += "</div>\n                                ";
      })
      out += "\n                            </div>\n                        </div>\n                        ";
    });
    out += "\n                        <div class=\"search-support-block\">\n                            <div class=\"support-block-title\">[$516]</div>\n                            <div class=\"email-button link\" data-href=\"#support\">\n                                <span>[$9100]</span>\n                            </div>\n                            <div class=\"support-block-subheading\">[$9101]</div>\n                        </div>\n                    </div>\n                    ";
  }
  out += "\n                </div>\n            </div>\n        </div> \n        ((BOTTOM))\n    </div>\n</div>\n";
  return (out);
}

__help2_templates.section = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "((TOP))\n\n<div class=\"main-scroll-block\">\n    <div class=\"main-pad-block help-home-page\">\n        <div class=\"help-background-block\"></div>\n        <div class=\"main-mid-pad new-bottom-pages help2\" id=\"help2-main\">\n            ";
  out += CMS.html(tpl.goback(data));
  out += "\n            <div class=\"main-pad-container\">\n                ";
  out += CMS.html(tpl.header(data));
  out += " \n            </div>\n            <div class=\"sidebar-menu-container\">\n                ";
  out += CMS.html(tpl.clients(data));
  out += "\n\n                <div class=\"sidebar-menu-slider directory\">\n                    <div class=\"helpsection-grayheading\">Sections</div>\n                    ";
  data.client.sections.forEach(function(section) {
    out += "\n                    <a class=\"sidebar-menu-link scrollTo\" data-to=\"#";
    out += escapeHTML(section.url);
    out += "\" id=\"section-";
    out += escapeHTML(section.url);
    out += "\">\n                        <div>";
    out += escapeHTML(section.name);
    out += "</div>\n                    </a>\n                    ";
  })
  out += "\n                </div>\n            </div>\n            <div class=\"support-info-container \">\n                <div class=\"main-directory-pad \">\n                    ";
  data.client.sections.forEach(function(section) {
    out += "\n                    <div class=\"d-section-container updateSelected\" id=\"";
    out += escapeHTML(section.url);
    out += "\"\n                         data-update=\"#section-";
    out += escapeHTML(section.url);
    out += "\">\n                        <div class=\"d-title-icon\"></div>\n                        <div class=\"d-section-title\">\n                            <a href=\"";
    out += escapeHTML(url("client", data.client.url, section.url));
    out += "\">";
    out += escapeHTML(section.name);
    out += "</a>\n                        </div>\n                        <div class=\"\">\n                            <ul class=\"d-section-items\">\n                                ";
    section.questions.forEach(function(question) {
      out += "\n                                <li>\n                                    <div class=\"d-bullet-point\"></div>\n                                    <a href=\"";
      out += escapeHTML(url("client", data.client.url, section.url, question.url));
      out += "\" class=\"content-by-tags-hide\"\n                                       data-tags=\"";
      out += escapeHTML(JSON.stringify(question.tags.map(function(w) {
        return tagUri(w)
      })));
      out += "\">\n                                       ";
      out += escapeHTML(question.question);
      out += "\n                                </a>\n                            </li>\n                            ";
    });
    out += "\n                        </ul>\n                    </div>\n                </div>\n                ";
  });
  out += "\n            </div>\n        </div>\n    </div> \n    ((BOTTOM))\n</div>\n</div>\n\n";
  return (out);
}

__help2_templates.sidebar_tags = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "<div class=\"sidebar-tags-container\">\n    <div class=\"helpsection-grayheading\">Filters</div>\n    ";
  tags(data.tags, !!data.is_client).forEach(function(tag) {
    out += "\n        <div class=\"tag-";
    out += escapeHTML(tag.tag);
    out += " support-tag ";
    out += escapeHTML(data.hasResult === false ? "link" : "real-time-filter");
    out += "\" data-tag=\"";
    out += escapeHTML(tag.tag);
    out += "\" data-href=\"";
    out += escapeHTML(url("tag", tag.tag));
    out += "\">\n            ";
    out += escapeHTML(tag.text);
    out += " ";
    out += escapeHTML(tag.count);
    out += "\n        </div>\n    ";
  })
  out += "\n</div>\n";
  return (out);
}

__help2_templates.welcome = function(context, data) {
  var out = "";
  var galleryHtml = context.galleryHtml;
  var tags = context.tags;
  var tagUri = context.tagUri;
  var sortClients = context.sortClients;
  var url = context.url;
  var tpl = context.tpl;
  var clients = context.clients;
  var popularQuestions = context.popularQuestions;
  out += "((TOP))\n\n<div class=\"main-scroll-block\">\n    <div class=\"main-pad-block help-home-page\">\n        <div class=\"help-background-block\"></div>\n        <div class=\"main-mid-pad new-bottom-pages help2\" id=\"help2-main\">\n            <div class=\"first-search-section\">\n                <div class=\"section-title\">[$9095]</div>\n                <div class=\"support-search-container\">\n                    <form id=\"support-search\" action=\"\">\n                        <input class=\"submit\" type=\"submit\" value=\"\">\n                        <input class=\"search\" type=\"text\" placeholder=\"[$9105]\">\n                    </form>\n                    <div class=\"search-suggestions-container hidden\">\n                        <ul class=\"search-suggestions-list\">\n                            <li class=\"search-suggestion-link\"><a href=\"\">Neque dolorem ipsum quia dolor sit amet</a></li>\n                            <li class=\"search-suggestion-link\"><a href=\"\"><span class=\"search-result-highlight\">Venison fatback</span> brisket andouille bresaola strip steak doner ball tip hamburger. </a></li>\n                            <li class=\"search-suggestion-link\"><a href=\"\">Quisquam est qui dolorem ipsum quia dolor sit amet</a></li>\n                            <li class=\"search-suggestion-link\"><a href=\"\">Dolorem ipsum quia dolor sit amet so tolor quia so sonor</a></li>\n                            <li class=\"search-suggestion-link\"><a href=\"\">View 6 more results</a></li>\n                        </ul>\n                    </div>\n                </div>\n            </div>\n\n            <!--<div class=\"first-option-block\">\n                <div class=\"first-container\">\n                    <div class=\"getstart-block  link\" data-href=\"#help/getting-started\">\n                        <div class=\"getstart-content\">\n                            <div class=\"getstart-img\"></div>\n                            <div class=\"getstart-heading\">\n                                Getting Started\n                            </div>\n                            <div class=\"getstart-subheading\">\n                                Learn how to use MEGA and our suite of products.\n                            </div>\n                            <div class=\"browsearticle-button\">\n                                <span>Browse Articles<div class=\"article-arrow\"></div></span>\n                            </div>\n                        </div>\n                    </div>\n    \n                    <div class=\"usemega-block\">\n                        <div class=\"usemega-content link\" data-href=\"#help/client/webclient\">\n                            <div class=\"usemega-img\"></div>\n                            <div class=\"usemega-heading\">\n                                Using MEGA\n                            </div>\n                            <div class=\"usemega-subheading\">\n                                Learn about some of the more advanced features of MEGA\n                            </div>\n                            <div class=\"browsearticle-button\">\n                                <span>Browse Articles<div class=\"article-arrow\"></div></span>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n            </div>-->\n            <div id=\"container\" class=\"\">\n                ";
  if (!data.is_mobile) {
    out += "\n                <div class=\"block mobile-block\">\n                    <div class=\"block-mobile\"></div>\n                    Mobile\n                    <div class=\"block-mobile-device\">\n                        <div class=\"iOS-mobile-block link\" data-href=\"";
    out += escapeHTML(url("client", "ios"));
    out += "\"></div>\n                        <div class=\"android-mobile-block link\" data-href=\"";
    out += escapeHTML(url("client", "android"));
    out += "\"></div>\n                        <div class=\"window-mobile-block link\" data-href=\"";
    out += escapeHTML(url("client", "windowsphone"));
    out += "\"></div>\n                    </div>\n                </div>\n                ";
  }
  out += "\n                ";
  clients.forEach(function(client) {
    out += "\n                ";
    if (client.tags.indexOf("mobile") !== -1) return;
    out += "\n                <div class=\"block link ";
    out += escapeHTML((client.tags || []).join(" "));
    out += "\" data-href=\"";
    out += escapeHTML(url(data.prefix || "client", client.url));
    out += "\">\n                    <div class=\"block-";
    out += escapeHTML(client.big_icon || client.url);
    out += "\"></div>\n                    ";
    out += escapeHTML(client.name);
    out += "\n                </div>\n                ";
  })
  out += "\n            </div>\n\n            <div class=\"clear\"></div>\n\n            <div class=\"popular-question-block\">\n                <div class=\"popular-question-title\">Frequently Asked Questions</div>\n                <div class=\"popular-question-list\">\n                    <ul class=\"popular-question-items\">\n                        ";
  popularQuestions.forEach(function(rel, id) {
    if (++id % 2 == 0) return;
    out += "\n                        <li><div class=\"related-bullet-point\"></div><a href=\"";
    out += escapeHTML(rel.full_url);
    out += "\"><span class=\"client-name\">";
    out += escapeHTML(rel.client.name);
    out += "</span> ";
    out += escapeHTML(rel.question);
    out += "</a></li>\n                        ";
  })
  out += "\n                    </ul>\n                </div>\n                <div class=\"popular-question-list\">\n                    <ul class=\"popular-question-items\">\n                        ";
  popularQuestions.forEach(function(rel, id) {
    if (++id % 2 == 1) return;
    out += "\n                        <li><div class=\"related-bullet-point\"></div><a href=\"";
    out += escapeHTML(rel.full_url);
    out += "\"><span class=\"client-name\">";
    out += escapeHTML(rel.client.name);
    out += "</span> ";
    out += escapeHTML(rel.question);
    out += "</a></li>\n                        ";
  })
  out += "\n                    </ul>\n                </div>\n            </div>\n\n            <div class=\"first-support-block\">\n                <div class=\"support-block-title\">[$516]</div>\n                <div class=\"support-block-subheading\">[$9101]</div>\n                <div class=\"email-button link\" data-href=\"#support\">\n                    <span>[$9100]</span>\n                </div>\n            </div>\n        </div> \n        ((BOTTOM))\n    </div>\n</div>\n\n";
  return (out);
}

