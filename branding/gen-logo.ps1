[cmdletbinding()]
param(
    [parameter(Mandatory,position=0)]
    [string]$project,
    [parameter(Mandatory,position=1)]
    [string]$LogoName
)
# Logo
mystro config -Source "./logos/$project/$LogoName.svg" -OutputDir "./logos/$project/dist" -AutoScale | mystro Gen
mystro config -Source "./" -OutputDir "./dist" -AutoScale | mystro Gen
