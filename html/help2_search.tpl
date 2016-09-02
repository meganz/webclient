((TOP))

<div class="main-scroll-block">
    <div class="main-pad-block help-home-page">
        <div class="help-background-block"></div>
        <div class="main-mid-pad new-bottom-pages help2" id="help2-main">

            <div class="search-section">
                <%! tpl.goback({ search: false, previous_url: data.previous_url }) %>
                <div class="section-title">
                    How can we help you today?
                </div>
                <div class="support-search-container">
                    <form id="support-search" action="">
                        <input class="submit" type="submit" value="">
                        <input class="search" type="text" placeholder="[$9105]" value="<%= data.search || "" %>">
                    </form>
                </div>
                <div class="mobile-search-block">
                    <div class="mobile-search-filters">
                        <ul class="mobile-search-list">
                            <li class="filter-selected">Device</li>
                            <li>Sort By</li>
                            <li>Tags</li>
                            <li>Reset All</li>
                        </ul>
                    </div>
                    <div class="sidebar-tags-container">
                        <div class="support-tag">Subscription 12</div>
                        <div class="support-tag">alphacentauri 09</div>
                        <div class="support-tag">galacti 06</div>
                        <div class="support-tag">ISIS 12</div>
                        <div class="support-tag">prawnsonson 12</div>
                        <div class="support-tag">alphacentauri 09</div>
                        <div class="support-tag">galacti 06</div>
                        <div class="support-tag">ISIS 12</div>
                        <div class="support-tag">prawnsonson 12</div>
                        <div class="support-tag">Subscription 12</div>
                        <div class="support-tag">alphacentauri 09</div>
                    </div>

                    <div class="sidebar-sort-container">
                        <ul class="sortby-items">
                            <!--
                            <li class="adv-search-selected">
                                <div class="adv-search-radio">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Most Views</span>
                            </li>
                            -->
                            <li class="adv-search-selected checked">
                                <div class="adv-search-radio">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Most Relevant</span>
                            </li>
                            <li class="adv-search-selected">
                                <div class="adv-search-radio">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Date Modified</span>
                            </li>
                            <li class="adv-search-selected">
                                <div class="adv-search-radio">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Least Views</span>
                            </li>
                            <li class="adv-search-selected">
                                <div class="adv-search-radio">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Least Relevant</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <% if (data.articles.length > 0) {  %>
                <div class="sidebar-menu-container">
                    <% if (data.articles.length > 0 && false) { %>
                    <%! tpl.clients(data) %>
                    <div class="sidebar-sort-container">
                        <div class="helpsection-grayheading">SORT BY</div>
                        <ul class="sortby-items">
                            <li class="adv-search-selected">
                                <div class="adv-search-radio checked">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Most Views</span>
                            </li>
                            <li class="adv-search-selected">
                                <div class="adv-search-radio checked">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Most Relevant</span>
                            </li>
                            <li class="adv-search-selected">
                                <div class="adv-search-radio">
                                    <input  class="checked" type="radio" value="voucher" name="voucher" checked="checked">
                                    <div></div>
                                </div>
                                <span>Date Modified</span>
                            </li>
                        </ul>
                    </div>
                    <% } %>
                    <%! tpl.sidebar_tags({ tags: data.articles, hasResult: data.hasResult }) %>
                </div>
                <% } %>

                <div class="support-info-container ">
                    <% if (!data.hasResult) { %>
                    <div class="search-404-block">
                        <div class="search-error-heading">[$9098]</div>
                        <div class="search-error-subheading">[$9099]</div>
                        <div class="email-button link" data-href="#support">
                            <span>[$9100]</span>
                        </div>
                    </div>
                    <% } else { %>
                    <div class="main-search-pad">
                        <% data.articles.forEach(function(result) { %>
                        <div class="search-result link content-by-tags" data-href="<%=result.url%>" data-tags="<%=JSON.stringify(result.tags.map(function(w) { return tagUri(w)}))%>">
                            <div class="search-result-title">
                                <%=result.title %>
                            </div>
                            <div class="search-result-content"><%=result.body%></div>
                            <div class="search-result-footer">
                                <div class="search-result-filter">
                                    <div class="result-filter-icon"></div>
                                    <div class="result-filter-result"><%= result.ups %></div>
                                </div>
                                <% result.tags.forEach(function(tag) { %>
                                <div class="support-tag tag-<%=tagUri(tag)%>" data-tag="<%=tagUri(tag)%>"><%=tag%></div>
                                <% }) %>
                            </div>
                        </div>
                        <% }); %>
                        <div class="search-support-block">
                            <div class="support-block-title">[$516]</div>
                            <div class="email-button link" data-href="#support">
                                <span>[$9100]</span>
                            </div>
                            <div class="support-block-subheading">[$9101]</div>
                        </div>
                    </div>
                    <% } %>
                </div>
            </div>
        </div> 
        ((BOTTOM))
    </div>
</div>
