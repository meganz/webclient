((TOP))

<div class="main-scroll-block">
   <div class="main-pad-block help-home-page">
    <div class="help-background-block"></div>
      <div class="main-mid-pad new-bottom-pages help2" id="help2-main">
        <%! tpl.goback(data) %>
        <div class="getstart-title-section">
            <div class="section-title"><%=data.title%></div>
            <div class="howto-section-subtitle"><%=data.subtitle%></div>
        </div>
        <div class="search-section hidden search-section-header">
            <div class="help-background-block"></div>
            <div class="search-close"><div class="close-icon"></div><span></span></div>
                <div class="section-title">[$9095]</div>
                <div class="support-search-container">
                    <form id="support-search" action="">
                        <input class="submit" type="submit" value="">
                        <input class="search" type="text" placeholder="Enter your search here&#46;&#46;&#46;">
                    </form>
                </div>
                <div class="popular-question-block">
                <div class="popular-question-title">[$9094]</div>
                <div class="popular-question-list">
                    <ul class="popular-question-items">
                        <li><div class="related-bullet-point"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti..</a></li>
                        <li><div class="related-bullet-point"></div><a>Justo vitae ipsum amet non</a></li>
                        <li><div class="related-bullet-point"></div><a>Mauris ullamcorper nec id libero, semper aenean in neque</a></li>
                        <li><div class="related-bullet-point"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti, in diam.</a></li>
                    </ul>
                </div>
                <div class="popular-question-list">
                    <ul class="popular-question-items">
                        <li><div class="related-bullet-point"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti..</a></li>
                        <li><div class="related-bullet-point"></div><a>Justo vitae ipsum amet non</a></li>
                        <li><div class="related-bullet-point"></div><a>Mauris ullamcorper nec id libero, semper aenean in neque</a></li>
                        <li><div class="related-bullet-point"></div><a>Lorem ipsum dolor sit amet, pharetra in elit potenti, in diam.</a></li>
                    </ul>
                </div>
            </div>
        </div>
        <div id="container" class="">
            <% if (!data.is_mobile) { %>
            <div class="block link" data-href="<%=url(data.prefix || "client", "mobile")%>">
                <div class="block-mobile"></div>
                Mobile
            </div>
            <% } %>
            <% clients.forEach(function(client) { %>
                <% if (!data.is_mobile && client.tags.indexOf("mobile") !== -1) return; %>
                <% if (data.is_mobile && client.tags.indexOf("mobile") === -1) return; %>
            <div class="block link" data-href="<%=url(data.prefix || "client", client.url)%>">
                <div class="block-<%=client.big_icon || client.url%>"></div>
                <%=client.name %>
            </div>
            <% }) %>
        </div>
      </div> 
      ((BOTTOM))
   </div>
</div>

