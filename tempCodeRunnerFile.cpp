#include<bits/stdc++.h>
using namespace std;
int main(){
    string filza="here it goes again";
    stringstream hel(filza);
    string pre,result;
    while(hel>>pre){
        cout<<pre<<endl;
        result.insert(0,pre+' ');
    }
    cout<<result;
return 0;
}