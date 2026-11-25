import { chromium } from "playwright";
const b = await chromium.launch(); const ctx = await b.newContext({viewport:{width:1366,height:900}}); const p = await ctx.newPage();
await p.goto("http://localhost:3000/login"); await p.fill('input[type=email]',"rent.demo@cardiwan.ae"); await p.fill('input[type=password]',"Demo1234!");
await Promise.all([p.waitForURL(u=>!u.toString().includes("/login")).catch(()=>{}), p.click('button[type=submit]')]);
await p.goto("http://localhost:3000/take-auto/search?q=overdue%20unpaid%20luxury%20car"); await p.waitForTimeout(1500);
await p.screenshot({path:"qa-screenshots/rent_search.png", fullPage:true});
await b.close(); console.log("shot saved");
