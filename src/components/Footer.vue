
<script>
export default {

}

</script>

<template>
    <footer>
        <p>IFT © {{(new Date(Date.now())).getFullYear()}}</p>
    </footer>
</template>


<style>

footer {
    position: absolute;
    bottom: 0;
    display: flex;
    justify-content: center;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    background-color: var(--color-primary);
    padding: 0 2rem env(safe-area-inset-bottom, 0px) 2rem;
    min-height: 4rem;
}

</style>
