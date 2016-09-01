((TOP))

<div class="main-scroll-block">
    <div class="main-pad-block help-home-page">
        <div class="help-background-block"></div>
        <div class="main-mid-pad new-bottom-pages help2" id="help2-main">
            <div class="first-search-section">
                <div class="section-title">[$9095]</div>
                <div class="support-search-container">
                    <form id="support-search" action="">
                        <input class="submit" type="submit" value="">
                        <input class="search" type="text" placeholder="Enter your search here&#46;&#46;&#46;">
                    </form>
                    <div class="search-suggestions-container hidden">
                        <ul class="search-suggestions-list">
                            <li class="search-suggestion-link"><a href="">Neque dolorem ipsum quia dolor sit amet</a></li>
                            <li class="search-suggestion-link"><a href=""><span class="search-result-highlight">Venison fatback</span> brisket andouille bresaola strip steak doner ball tip hamburger. </a></li>
                            <li class="search-suggestion-link"><a href="">Quisquam est qui dolorem ipsum quia dolor sit amet</a></li>
                            <li class="search-suggestion-link"><a href="">Dolorem ipsum quia dolor sit amet so tolor quia so sonor</a></li>
                            <li class="search-suggestion-link"><a href="">View 6 more results</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!--<div class="first-option-block">
                <div class="first-container">
                    <div class="getstart-block  link" data-href="#help/getting-started">
                        <div class="getstart-content">
                            <div class="getstart-img"></div>
                            <div class="getstart-heading">
                                Getting Started
                            </div>
                            <div class="getstart-subheading">
                                Learn how to use MEGA and our suite of products.
                            </div>
                            <div class="browsearticle-button">
                                <span>Browse Articles<div class="article-arrow"></div></span>
                            </div>
                        </div>
                    </div>
    
                    <div class="usemega-block">
                        <div class="usemega-content link" data-href="#help/client/webclient">
                            <div class="usemega-img"></div>
                            <div class="usemega-heading">
                                Using MEGA
                            </div>
                            <div class="usemega-subheading">
                                Learn about some of the more advanced features of MEGA
                            </div>
                            <div class="browsearticle-button">
                                <span>Browse Articles<div class="article-arrow"></div></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>-->
            <div id="container" class="">
                <% if (!data.is_mobile) { %>
                <div class="block mobile-block">
                    <div class="block-mobile"></div>
                    Mobile
                    <div class="block-mobile-device">
                        <div class="iOS-mobile-block link" data-href="<%=url("client", "ios")%>"></div>
                        <div class="android-mobile-block link" data-href="<%=url("client", "android")%>"></div>
                        <div class="window-mobile-block link" data-href="<%=url("client", "windowsphone")%>"></div>
                    </div>
                </div>
                <% } %>
                <% clients.forEach(function(client) { %>
                <% if (client.tags.indexOf("mobile") !== -1) return; %>
                <div class="block link <%= (client.tags||[]).join(" ")%>" data-href="<%=url(data.prefix || "client", client.url)%>">
                    <div class="block-<%=client.big_icon || client.url%>"></div>
                    <%=client.name %>
                </div>
                <% }) %>
            </div>

            <div class="clear"></div>

            <div class="popular-question-block">
                <div class="popular-question-title">Frequently Asked Questions</div>
                <div class="popular-question-list">
                    <ul class="popular-question-items">
                        <% popularQuestions.forEach(function(rel, id) { if (++id % 2 == 0) return ; %>
                        <li><div class="related-bullet-point"></div><a href="<%= rel.full_url %>"><span class="client-name"><%=rel.client.name%></span> <%= rel.question %></a></li>
                        <% }) %>
                    </ul>
                </div>
                <div class="popular-question-list">
                    <ul class="popular-question-items">
                        <% popularQuestions.forEach(function(rel, id) { if (++id % 2 == 1) return ; %>
                        <li><div class="related-bullet-point"></div><a href="<%= rel.full_url %>"><span class="client-name"><%=rel.client.name%></span> <%= rel.question %></a></li>
                        <% }) %>
                    </ul>
                </div>
            </div>

            <div class="first-support-block">
                <div class="support-block-title">[$516]</div>
                <div class="support-block-subheading">[$9101]</div>
                <div class="email-button link" data-href="#support">
                    <span>[$9100]</span>
                </div>
            </div>
        </div> 
        ((BOTTOM))
    </div>
</div>

