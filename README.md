top 3 lowest points in life

react + vite frontend\
node + express backend

tasks as they were given during the 9 hour "practical exam":

jurnal facultate ziar   
0\:  
working title: teoria transpiratiei  
facem frontendul, master \- detail cu entitati hardcodate  
sa avem: pagina principala a ziarului, sa avem un logo si titlu, pe margine sa avem master view cu titlu de articol si data, click pe articol si apare detail view, no backend yet

1\:  
backend, acelasi lucru, strict read-only, doar informatia se afla pe backend si facem endpointurile necesare pentru a o duce din backend pe frontend, in loc sa fie in memorie, le fetchuiesti peste retea, important este sa fie doua masini diferite in lan

2\:  
implement login register, have a database with the table for users, two new views, one for login, one for register, and the users can have the following roles: admin, editor, journalist, user

journalist and editor extend the user, but they have additional permissions

admin is red, editor is yellow, journalist is blue, normal user is green; after logging in, the background color of the landing page should have the appropriate background; on register, you can create an account with any role except admin, picked from a dropdown menu, the admin account is hardcoded in the database table with credentials: username:admin, password:admin; register only takes username and password

lore break:  
ganditi va logic la cum se foloseste un jurnal; pagina principala e aia in care nu iti faci cont si vezi ce vrea sa iti arate jurnalul in ziua respectiva, ca user, daca te logezi, iti dai acordul sa ti se ia date sa iti personalizeze jurnalul

editor: singurul care poate creea articole, singurul care are butonul de adauga; acesta poate sa ii dea unui jurnalist sau mai multor jurnalisti sa se ocupe de articol; articolul este implementat de o echipa dintr un erticol si MAXIM doi jurnalisti; pe fiecare articol apare lista jurnalistilor care au facut articolul, editorul nu este vizibil pentru utilizator

3\.  
create the db table of articles, each has title, date, status;  
create the db table of paragraphs, which has text and articleID, so one to many between article and paragraphs  
create the db table of images, which has the actual image path and the paragraphID, again one to many but now between paragraphs and images  
seed the database with the articles which are currently hardcoded

editor part of the app;   
the editor will have a view for creating an article, where he can edit the previously mentioned objects in the database  
besides that, from a dropdown menu he can assign journalists to that specific article, and he can also update the status from started, pending and finished; only editors can change the status of an article, when creating an article status is by default started

you can progressively add paragraphs and for each paragraph you can add photos

create any database table you see fit for this  
frontend and backend validation of the data;

create unit tests for the endpoints in the backend

editor can see all articles regardless of their status, users and non logged in users can only see finished articles, the articles which were seeded in the database should be all tagged as finished

also, create a new table in the database ("comments"), there is a one to many relationship between paragraphs and comments, for each paragraph the editor  can add comments 

4\.  
the journalist, can see only finished articles and the articles he is assigned to; the journalist also has an edit button like the editor, but he can only edit articles, he cannot create new ones; he cannot edit the title, only the paragraphs, images; he can also see the comments from the editor but he himself cannot comment; the comments are also not visible by the user, they’re only visible in the article edit form of the journalist or editor; the journalist can edit only the things he is assigned to

5\.  
the editor can change the order of the paragraphs within an article; don’t do it very fancy, have some arrows on each paragraphs which can move an article up or down

for a comment given by an editor, add the field STATUS in the database, which can be either resolved or unresolved, when an editor leaves a comment it is first unresolved and he can press the resolve button; the delete button still remains for the comments

in order to change the status to Finalized there should be NO COMMENTS which are unresolved on any paragraphs; otherwise the status cannot be changed to finished / finalizat

6\.  
LOGGED IN users can add like and dislike on articles

The admin can see a dashboard with stats on likes and dislikes

7\. users can comment

8\. an ai model should read comments and give sentiment analysis

9\. HTTPS si JWT si authentication

10\.  
mandatory fara gpt cica  
creeaza un pattern al utilizatorului in functie de like / dislike / comments; transformi fiecare utilizator intr-un vector de floats si gasesti un articol stiintific, implementezi de la 0 un recommending system, sa ii puna trei articole pe baza la ce like-uri si dislike-uri a dat si ce comentarii si sentimente poti manageria din behaviour

11\.  
detect malevolent behaviour, make this run as a background process which checks this periodically, not on the post requests, an async thing that uses ollama  
POSTAC: posts too many comments, spams the platform with comments, displays ban message, if they try to log in again ban message  
VULGAR:flags vulgar language, again banned, this should ideally work with both romanian and english comments  
use OLLAMA to detect both of these

