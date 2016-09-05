((TOP))

<div class="main-scroll-block">
    <div class="main-pad-block help-home-page">
        <div class="help-background-block"></div>
        <div class="main-mid-pad new-bottom-pages help2" id="help2-main">
            <%! tpl.goback(data) %>
            <div class="main-pad-container">
                <%! tpl.header(data) %>
                <div class="sidebar-menu-container">
                    <%! tpl.clients(data) %>

                    <div class="sidebar-menu-slider directory">
                        <div class="helpsection-grayheading">[$9097]</div>
                        <% data.section.questions.forEach(function(question) { %>
                        <a class="sidebar-menu-link scrollTo" data-to="#<%=question.url%>"
                           id="section-<%=question.url%>" data-state="<%=data.base_url + "/" +  question.url%>">
                           <div><%=question.question%></div>
                        </a>
                        <% }) %>
                    </div>

                    <div class="sidebar-sort-container hidden">
                        <div class="helpsection-grayheading">SORT BY</div>
                        <ul class="sortby-items">
                            <li class="adv-search-selected">
                                <div class="adv-search-radio checked">
                                    <input class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Most Views</span>
                            </li>
                            <li class="adv-search-selected">
                                <div class="adv-search-radio">
                                    <input class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Most Relevant</span>
                            </li>
                            <li class="adv-search-selected">
                                <div class="adv-search-radio">
                                    <input class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Date Modified</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div class="support-info-container">
                    <div class="main-content-pad">

                        <% data.section.questions.forEach(function(question) { %>
                        <div class="support-article content-by-tags  updateSelected"  data-update="#section-<%=question.url%>" id="<%= question.url%>" data-tags="<%=JSON.stringify(question.tags.map(function(w) { return tagUri(w)}))%>">
                            <div class="support-article-heading"><%=question.question %></div>
                            <div class="support-article-infobar">
                                <div class="support-viewcount hidden">VIEWS<div class="support-viewcount-result">1023</div></div>
                                <div class="support-updatedate">Updated<div class="support-updatedate-result"><%=humandate(question.created)%></div></div>
                                <div class="support-interaction">
                                    <div class="support-link-icon"></div>
                                    <div class="support-email-icon"></div>
                                </div>
                            </div>
                            <div class="clear"></div>
                            <div class="support-article-info">
                                <%! galleryHtml(question.answer, question.galleries) %>
                            </div>
                            <div class="related-and-tags-container">
                                <% if (question.related.length >  0) { %>
                                <div class="related-articles">
                                    <div class="related-articles-title">Related Articles</div>
                                    <div class="clear"></div>
                                    <ul class="related-articles-list">
                                        <% question.related.forEach(function(rel) { rel = data.articlesById[rel]; %>
                                        <li><div class="related-bullet-point"></div><a href="<%= rel.full_url %>"><span class="client-name"><%=rel.client.name%></span> <%= rel.question %></a></li>
                                        <% }) %>
                                    </ul>
                                </div>
                                <% } %>
                                <% if (question.tags.length > 0) { %>
                                <div class="related-tags hidden">
                                    <div class="related-tags-title">
                                        Related Tags
                                    </div>
                                    <div class="clear"></div>
                                    <div class="related-tags-list">
                                        <% question.tags.forEach(function(tag) { %>
                                        <div class="support-tag tag-<%=tagUri(tag)%>" data-tag="<%=tagUri(tag)%>"><%=tag%></div>
                                        <% }) %>
                                    </div>
                                </div>
                                <% } %>
                            </div>
                            <div class="clear"></div>
                            <div class="article-feedback-container">
                                <div class="feedback-heading">
                                    <div class="feedback-logo"></div>
                                    <p>Did you find this helpful?</p>
                                </div>
                                <div class="feedback-buttons">
                                    <div class="feedback-yes" data-hash="<%= question.up %>">
                                        <div>Yes</div>
                                        <div class="yes-icon icon"></div>
                                    </div>
                                    <div class="feedback-no" data-hash="<%= question.down %>">
                                        <div>No</div>
                                        <div class="no-icon icon"></div>
                                    </div>
                                </div>
                                <div class="feedback-suggestions-list">
                                    <div class="feedback-suggestions-title">
                                        We're sorry you didn't find this helpful. What can we do to improve it?
                                    </div>
                                    <ul>
                                        <li class="adv-search-selected checked">
                                            <div class="adv-search-radio">
                                                <input type="radio" value="dont-understand-answer" name="feedback-radio" checked="checked">
                                                <div></div>
                                            </div>
                                            <span>I don't understand the answer.</span>
                                        </li>
                                        <li class="adv-search-selected">
                                            <div class="adv-search-radio">
                                                <input type="radio" value="dont-speak-english" name="feedback-radio">
                                                <div></div>
                                            </div>
                                            <span>I don't speak English.</span>
                                        </li>
                                        <li class="adv-search-selected">
                                            <div class="adv-search-radio">
                                                <input type="radio" value="out-of-date" name="feedback-radio">
                                                <div></div>
                                            </div>
                                            <span>This is out of date.</span>
                                        </li>
                                        <li class="adv-search-selected">
                                            <div class="adv-search-radio">
                                                <input type="radio" value="images-not-correct" name="feedback-radio">
                                                <div></div>
                                            </div>
                                            <span>The images are not correct.</span>
                                        </li>
                                    </ul>
                                    <textarea name="text" class="feedback-suggestion-form" rows="4" placeholder="Enter here..."></textarea> 
                                    <div class="feedback-send">Send</div>
                                </div>
                            </div>
                            <div class="article-end"></div>
                        </div>
                        <% }) %>
                    </div>
                </div>
            </div>
        </div> 
        ((BOTTOM))
    </div>
</div>

