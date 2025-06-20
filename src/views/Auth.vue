const res = await fetch('http://localhost:8080/api/dropbox/files');
const files = await res.json();
console.log(files);
