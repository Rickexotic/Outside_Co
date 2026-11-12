const sections = document.querySelectorAll(".slide");
const navLinks = document.querySelectorAll(".side-nav a");

const observer = new IntersectionObserver(

(entries)=>{

entries.forEach(entry=>{

if(!entry.isIntersecting) return;

const id = entry.target.id;

navLinks.forEach(link=>{

link.classList.remove("active");

if(link.getAttribute("href")==="#" + id){

link.classList.add("active");

}

});

});

},

{
threshold:0.5
}

);
sections.forEach(section=>observer.observe(section));

const bigNumber = document.querySelector(".big-number");

let started = false;

const counterObserver = new IntersectionObserver(

(entries)=>{

entries.forEach(entry=>{

if(started) return;

if(!entry.isIntersecting) return;

started = true;

let value = 0;

const interval = setInterval(()=>{

value++;

bigNumber.innerText = value + "%";

if(value === 90){

clearInterval(interval);
}

},15);

});

}

);

counterObserver.observe(bigNumber);
