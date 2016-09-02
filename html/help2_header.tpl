<div class="main-title-section">
    <% if (data.title) { %>
    <div class="section-title">
        <%= data.title %>
    </div>
    <% } %>
    <% if (typeof data.subtitle !== 'undefined') { %>
    <div class="howto-section-subtitle">
        <%= data.subtitle %>
    </div>
    <% } %>
</div>

<div class="search-section hidden search-section-header">
    <div class="help-background-block"></div>
    <div class="search-close"><div class="close-icon"></div><span></span></div>
    <div class="section-title">[$9095]</div>
    <div class="support-search-container">
        <form id="support-search" action="">
            <input class="submit" type="submit" value="">
            <input class="search" type="text" placeholder="[$9105]">
        </form>
    </div>
    <div class="popular-question-block">
        <div class="popular-question-title">[$9094]</div>
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
</div>
