viron-application-header.Application_Header
  .Application_Header__aside
    viron-icon-search
  .Application_Header__aside
    viron-icon-square
    viron-icon-dots

  script.
    import '../components/icons/viron-icon-dots/index.tag';
    import '../components/icons/viron-icon-search/index.tag';
    import '../components/icons/viron-icon-square/index.tag';
    import script from './header';
    this.external(script);