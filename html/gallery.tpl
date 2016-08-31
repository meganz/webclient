<div class="<%= data.landscape ? "support-image-container" : "mobile-support-image-container" %> container">
    <div class="<%= data.landscape ? "support-images-gallery": "mobile-support-images-gallery" %> photos">
        <% data.photos.forEach(function(photo, i) { %>
            <img src="{cmspath}/unsigned/<%=photo[1]%>" alt="" class="<%=i === 0 ? 'img-active ': '' %> img-swap photo-id-<%=i%>" style="height: <%= 613* (data.landscape ? 1 : .42) / photo[2] * photo[3]  %>px"/>
        <% }) %>
    </div>
    <div class="nav-dots-container">
        <ul class="gallery-dot-navigation">
            <% data.photos.forEach(function(photo, i) { %>
            <li class="<%! i === 0 ? 'active-nav-dot' : 'nav-dots'%> dot-<%=i%>" data-photo="<%=i%>"></li>
            <% }) %>
        </ul>
    </div>
    <div class="<%= data.landscape ? "support-image-instructions" : "mobile-support-image-instructions" %> instructions">
         <ul>
            <% data.photos.forEach(function(photo, i) { %>
            <div class="bullet-number <%=i === 0 ? 'selected-bullet': ''%> bullet-<%=i%>"  data-photo="<%=i%>"><%=i + 1%></div>
            <li class="image-instruction-control <%=i === 0 ? 'active-instructions': ''%> instruction-<%=i%>" data-photo="<%=i%>">
                <%! photo[0] %>
            </li>
            <% }) %>
        </ul>
    </div>
</div>
